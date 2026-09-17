import base64
import csv
import json
import os
import re
from datetime import date, datetime
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[3]
CSV_PATTERN = "ap_inv*.csv"



def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value

def load_run_profile() -> dict:
    name = required_env("RUN_PROFILE").strip().lower()
    if not re.fullmatch(r"[a-z0-9_-]+", name):
        raise RuntimeError(f"Invalid run profile name: {name}")

    profile_path = ROOT / "environments" / "run-profiles" / f"{name}.json"
    if not profile_path.is_file():
        raise RuntimeError(f"Run profile not found: {profile_path}")
    try:
        profile = json.loads(profile_path.read_text(encoding="utf-8-sig"))
    except ValueError as error:
        raise RuntimeError(f"Run profile is not valid JSON: {profile_path}") from error
    if not isinstance(profile, dict):
        raise RuntimeError("Run profile must contain a JSON object")

    def require_text(data: dict, key: str) -> str:
        value = data.get(key)
        if not isinstance(value, str) or not value.strip():
            raise RuntimeError(f"Run profile field '{key}' is required: {profile_path}")
        return value.strip()

    data_path = (ROOT / require_text(profile, "testDataPath")).resolve()
    try:
        relative_data_path = data_path.relative_to((ROOT / "test-data").resolve())
    except ValueError as error:
        raise RuntimeError("Invoice testDataPath must be inside the repository test-data folder") from error
    users = profile.get("users")
    user = users.get("standardUser") if isinstance(users, dict) else None
    if not isinstance(user, dict):
        raise RuntimeError("Run profile user 'standardUser' is required")

    return {
        "name": name,
        "baseUrl": require_text(profile, "baseUrl"),
        "username": require_text(user, "username"),
        "password": require_text(user, "password"),
        "csvFolder": data_path / "ap",
        "outputFolder": ROOT / "output" / relative_data_path / "ap",
    }


def optional(value: str | None) -> str | None:
    value = (value or "").strip()
    return value or None


def try_decode_base64(value: str) -> str | None:
    cleaned = value.strip()
    if not cleaned:
        return None

    padding = "=" * (-len(cleaned) % 4)

    try:
        decoded_bytes = base64.b64decode(cleaned + padding, validate=True)
        decoded_text = decoded_bytes.decode("utf-8", errors="replace").strip()
        return decoded_text or None
    except Exception:
        return None


def readable_response_text(response_text: str) -> str:
    readable = response_text.strip()

    matches = re.findall(
        r'value="([^"]+)"',
        response_text,
        flags=re.IGNORECASE,
    )

    decoded_values = []

    for value in matches:
        decoded = try_decode_base64(value)
        if decoded:
            decoded_values.append(decoded)

    if decoded_values:
        readable += "\n\nDecoded Base64 values:\n"
        readable += "\n\n".join(decoded_values)

    return readable


def find_invoice_csv(profile: dict) -> Path:
    csv_folder = profile["csvFolder"]
    matches = sorted(match for match in csv_folder.glob(CSV_PATTERN) if match.is_file())

    if not matches:
        raise RuntimeError(f"No CSV files found matching {csv_folder / CSV_PATTERN}")

    if len(matches) > 1:
        raise RuntimeError(
            "More than one invoice CSV file found:\n"
            + "\n".join(str(match) for match in matches)
        )

    return matches[0]

def read_invoice_rows(profile: dict) -> tuple[Path, Path, list[dict[str, str]]]:
    csv_path = find_invoice_csv(profile)
    timestamp = os.getenv("RUN_TIMESTAMP", "").strip()
    if not timestamp:
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]*", timestamp):
        raise RuntimeError("RUN_TIMESTAMP must contain only letters, numbers, hyphens, and underscores.")
    output_folder = profile["outputFolder"] / timestamp
    output_folder.mkdir(parents=True, exist_ok=True)
    output_path = output_folder / "ap_inv_log.json"

    print(f"Reading invoice CSV: {csv_path}")
    #print(f"Output log file: {output_path}")

    with csv_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        rows = list(csv.DictReader(csv_file))

    return csv_path, output_path, rows

def write_output_file(output_path: Path, data: dict) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(data, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote output log file: {output_path}")
    
def build_invoice_payload(row: dict[str, str], prefix: str, suffix: str | None = None) -> dict:
    today = date.today().isoformat()

    # CSV dates may be omitted, blank, or written as null.
    def invoice_date(column: str) -> str:
        value = optional(row.get(column))
        if value is None or value.lower() == "null":
            return today
        for date_format in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
            try:
                return datetime.strptime(value, date_format).date().isoformat()
            except ValueError:
                continue
        raise ValueError(
            f"Invalid {column} date: {value!r}. Use YYYY-MM-DD, MM/DD/YYYY, or MM/DD/YY."
        )

    return {
        "PurchaseOrderNumber": optional(row["IDENTIFYING_PO"]),
        "BusinessUnit": row["BUSINESS_UNIT"],
        "Supplier": row["SUPPLIER"],
        "SupplierSite": row["SUPPLIER_SITE"],
        "LegalEntity": row["LEGAL_ENTITY"],
        "InvoiceGroup": row["INVOICE_GROUPS"],
        "InvoiceNumber": prefix + row["NUMBER"] + (suffix or ""),
        "InvoiceAmount": float(row["AMOUNT"]),
        "InvoiceType": row["TYPE"],
        "Description": row["DESCRIPTION"],
        "InvoiceDate": invoice_date("DATE"),
        "PaymentTerms": row["PAYMENT_TERMS"],
        "TermsDate": invoice_date("TERMS_DATE"),
        "InvoiceCurrency": row["INVOICE_CURRENCY"],
        "PaymentCurrency": row["PAYMENT_CURRENCY"],
        "PaymentMethodCode": row["PAYMENT_METHOD_CODE"],
        "Requester": row["REQUESTER"],
        "invoiceLines": [
            {
                "LineNumber": int(row["LINE_NUMBER"]),
                "LineType": row["LINE_TYPE"],
                "LineAmount": float(row["LINE_AMOUNT"]),
                "DistributionSet": optional(row["DISTRIBUTION_SET"]),
                "DistributionCombination": optional(row["DISTRIBUTION_COMBINATION"]),
                "AccountingDate": invoice_date("LINE_ACCOUNTING_DATE")
            }
        ],
    }


def create_invoice(payload: dict, profile: dict) -> dict:
    base_url = profile["baseUrl"].rstrip("/")
    api_path = os.getenv(
        "ORACLE_INVOICE_API_PATH",
        "/fscmRestApi/resources/11.13.18.05/invoices",
    )
    url = f"{base_url}{api_path}"

    response = requests.post(
        url,
        auth=(profile["username"], profile["password"]),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/vnd.oracle.adf.resourceitem+json",
            "REST-Framework-Version": "4",
        },
        json=payload,
        timeout=60,
        allow_redirects=False,
    )

    content_type = response.headers.get("Content-Type")
    location = response.headers.get("Location")
    raw_response = response.text

    try:
        parsed_response = response.json()
    except ValueError:
        parsed_response = None

    if response.status_code not in (200, 201):
        return {
            "success": False,
            "statusCode": response.status_code,
            "message": "Oracle invoice creation failed.",
            "contentType": content_type,
            "location": location,
            "apiResponse": readable_response_text(raw_response),
        }

    if parsed_response is None:
        return {
            "success": False,
            "statusCode": response.status_code,
            "message": "Invoice request completed, but Oracle did not return JSON.",
            "contentType": content_type,
            "location": location,
            "apiResponse": readable_response_text(raw_response),
        }

    invoice_number = parsed_response.get("InvoiceNumber") or parsed_response.get("invoiceNumber")
    invoice_id = parsed_response.get("InvoiceId") or parsed_response.get("invoiceId")

    if not invoice_number and not invoice_id:
        return {
            "success": False,
            "statusCode": response.status_code,
            "message": "Oracle returned JSON, but it does not look like a created invoice response.",
            "contentType": content_type,
            "location": location,
            "apiResponse": parsed_response,
        }

    return {
        "success": True,
        "statusCode": response.status_code,
        "message": "Invoice created successfully.",
        "contentType": content_type,
        "location": location,
        "apiResponse": parsed_response,
    }


def main() -> None:
    prefix = required_env("PREFIX")
    suffix = os.getenv("SUFFIX")
    profile = load_run_profile()
    print(f"Run profile: {profile['name']}")
    csv_path, output_path, rows = read_invoice_rows(profile)

    if not rows:
        raise RuntimeError(f"No invoice rows found in {csv_path}")

    payload = build_invoice_payload(rows[0], prefix, suffix)
    response_result = create_invoice(payload, profile)

    api_response = response_result.get("apiResponse")

    if isinstance(api_response, dict):
        invoice_number = (
            api_response.get("InvoiceNumber")
            or api_response.get("invoiceNumber")
            or payload["InvoiceNumber"]
        )
        invoice_id = api_response.get("InvoiceId") or api_response.get("invoiceId")
    else:
        invoice_number = payload["InvoiceNumber"]
        invoice_id = None

    # Keep one log per invoice; replace characters Windows does not allow in filenames.
    filename_invoice = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", str(invoice_number)).rstrip(" .")
    output_path = output_path.with_name(f"ap_inv_log_{filename_invoice}.json")

    write_output_file(output_path,
        {
            "success": response_result["success"],
            "runProfile": profile["name"],
            "invoiceNumber": invoice_number,
            "invoiceId": invoice_id,
            "request": payload,
            "response": {
                "statusCode": response_result["statusCode"],
                "message": response_result["message"],
                "contentType": response_result["contentType"],
                "location": response_result["location"],
                "apiResponse": response_result["apiResponse"],
            },
        }
    )

    if response_result["success"]:
        print(f"Created invoice {invoice_number}")

    else:
        print(f"Invoice was not created: {response_result['message']}")




if __name__ == "__main__":
    main()
