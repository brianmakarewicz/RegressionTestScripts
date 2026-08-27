import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Represents the Oracle Fusion notifications panel and Notifications page.
 */
export class FusionNotificationsPage {
  constructor(private readonly page: Page) {}

  /*private notificationButton(): Locator {
    return this.page
      .getByRole("link", { name: "Notifications (4 unread)", exact: false });
  }*/
  private notificationButton(): Locator {
  return this.page.getByRole("link", {name: /^Notifications(?: \(\d+ unread\))?$/ });
}

  private showAllLink(): Locator {
    return this.page.getByRole("link", { name: "Show All", exact: true });
  }

  private moreDetailsLink(): Locator {
    return this.page.getByRole("link", {
      name: "More Details",
      exact: true,
    });
  }

  /** Opens the notifications panel from the Fusion shell. */
  async openNotificationsPanel(): Promise<void> {
    const notificationButton = this.notificationButton();

    await expect(notificationButton).toBeVisible({ timeout: 30_000 });
    await notificationButton.click();
  }

  /**
   * Opens Notifications through the available panel link.
   *
   * Returns false when the signed-in user has no Show All or More Details link.
   */
  async openNotificationsPageIfAvailable(): Promise<Page | null> {
    const showAllLink = this.showAllLink();
    const moreDetailsLink = this.moreDetailsLink();

    const hasAvailableLink = await expect
      .poll(
        async () =>
          (await showAllLink.isVisible()) || (await moreDetailsLink.isVisible()),
        {
          message: "Waiting for a Show All or More Details notification link",
          timeout: 30_000,
        },
      )
      .toBe(true)
      .then(() => true)
      .catch(() => false);

    if (!hasAvailableLink) {
      return null;
    }

    if (await showAllLink.isVisible()) {
      return this.openNotificationsPage(showAllLink);
    }

    if (await moreDetailsLink.isVisible()) {
      return this.openNotificationsPage(moreDetailsLink);
    }

    return null;
  }

  /** Opens the selected notification link and waits for Notifications to load. */
  private async openNotificationsPage(notificationLink: Locator): Promise<Page> {
    // Oracle Fusion opens Notifications in the current browser page, not a popup.
    await expect(
      this.page.getByRole("heading", {
        name: "Notifications",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 30_000 });

    await notificationLink.click();

    return this.page;
  }

  /** Confirms the Notifications page is ready. */
  async verifyNotificationsPage(notificationsPage: Page): Promise<void> {
    await expect(
      notificationsPage.getByRole("button", {
        name: "Worklist",
        exact: true
      }),
    ).toBeVisible({ timeout: 30_000 });
  }
}
