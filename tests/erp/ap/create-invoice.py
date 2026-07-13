import base64
import csv
import json
import os
import re
from pathlib import Path
from datetime import datetime
import subprocess

import requests
from dotenv import load_dotenv

timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

ROOT = Path(__file__).resolve().parents[3]
CSV_FOLDER = ROOT / "test-data"
CSV_PATTERN = "ap_inv*.csv"
# OUTPUT_PATH = ROOT / "output" / f"{timestamp}_create_invoice_log.json"
ENV_PATH = ROOT / "environments" / ".env.demo.dev"


def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


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

def find_invoice_csv() -> Path:
    matches = sorted(CSV_FOLDER.glob(CSV_PATTERN))

    if not matches:
        raise RuntimeError(f"No CSV files found matching {CSV_FOLDER / CSV_PATTERN}")

    if len(matches) > 1:
        raise RuntimeError(
            "More than one invoice CSV file found:\n"
            + "\n".join(str(match) for match in matches)
        )

    return matches[0]

def read_invoice_rows() -> tuple[Path, list[dict[str, str]]]:
    csv_path = find_invoice_csv()
    output_path = ROOT / "output" / f"{csv_path.stem}_log.json"

    print(f"Reading invoice CSV: {csv_path}")
    print(f"Output log file: {output_path}")

    with csv_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        rows = list(csv.DictReader(csv_file))

    return output_path, rows

def write_output_file(output_path: Path, data: dict) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(data, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {output_path}")
    
def build_invoice_payload(row: dict[str, str]) -> dict:
    return {
        "PurchaseOrderNumber": optional(row["IDENTIFYING_PO"]),
        "BusinessUnit": row["BUSINESS_UNIT"],
        "Supplier": row["SUPPLIER"],
        "SupplierSite": row["SUPPLIER_SITE"],
        "LegalEntity": row["LEGAL_ENTITY"],
        "InvoiceGroup": row["INVOICE_GROUPS"],
        "InvoiceNumber": row["NUMBER"],
        "InvoiceAmount": float(row["AMOUNT"]),
        "InvoiceType": row["TYPE"],
        "Description": row["DESCRIPTION"],
        "InvoiceDate": row["DATE"],
        "PaymentTerms": row["PAYMENT_TERMS"],
        "TermsDate": row["TERMS_DATE"],
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
                "AccountingDate": row["LINE_ACCOUNTING_DATE"]
            }
        ],
    }


def create_invoice(payload: dict) -> dict:
    base_url = required_env("ORACLE_BASE_URL").rstrip("/")
    api_path = os.getenv(
        "ORACLE_INVOICE_API_PATH",
        "/fscmRestApi/resources/11.13.18.05/invoices",
    )
    url = f"{base_url}{api_path}"

    response = requests.post(
        url,
        auth=(required_env("ORACLE_USERNAME"), required_env("ORACLE_PASSWORD")),
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
    if not ENV_PATH.exists():
        raise RuntimeError(f"Environment file not found: {ENV_PATH}")

    load_dotenv(ENV_PATH)

    client_alias = os.getenv("CLIENT_ALIAS", "unknown")
    environment = os.getenv("ENVIRONMENT", "unknown")

    output_path, rows = read_invoice_rows()
    if not rows:
        raise RuntimeError(f"No invoice rows found in {csv_path}")

    payload = build_invoice_payload(rows[0])
    response_result = create_invoice(payload)

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

    write_output_file(output_path,
        {
            "success": response_result["success"],
            "clientAlias": client_alias,
            "environment": environment,
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

        env = os.environ.copy()
        env["INVOICE_OUTPUT_FILE"] = str(output_path)

        subprocess.run(
            ["npx.cmd", "playwright", "test", "tests/erp/ap/validate-approve-invoice.spec.ts", "--headed"],
            check=True,
            env=env
        )
    else:
        print(f"Invoice was not created: {response_result['message']}")

    print(f"Environment: {client_alias}/{environment}")



if __name__ == "__main__":
    main()
