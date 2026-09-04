import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Represents the Oracle Fusion notifications panel and Notifications page.
 */
export class FusionNotificationsPage {
  constructor(private readonly page: Page) {}

  private notificationButton(): Locator {
    return this.page.getByRole("link", {
      name: /^Notifications(?: \(\d+ unread\))?$/,
    });
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
   */
  async openNotificationsPage(): Promise<Page> {
    const showAllLink = this.showAllLink();
    const moreDetailsLink = this.moreDetailsLink();

    await expect
      .poll(
        async () =>
          (await showAllLink.isVisible()) || (await moreDetailsLink.isVisible()),
        {
          message: "Expected a Show All or More Details notification link",
          timeout: 30_000,
        },
      )
      .toBe(true);

    if (await showAllLink.isVisible()) {
      return this.openNotificationDetailPage(showAllLink);
    }

    if (await moreDetailsLink.isVisible()) {
      return this.openNotificationDetailPage(moreDetailsLink);
    }

    throw new Error("No notification detail link was available to open");
  }

  /** Opens the selected notification link and waits for Notifications to load. */
  private async openNotificationDetailPage(
    notificationLink: Locator,
  ): Promise<Page> {
    await notificationLink.click();

    // Oracle Fusion opens Notifications in the current browser page, not a popup.
    await expect(
      this.page.getByRole("heading", {
        name: "Notifications",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 30_000 });

    return this.page;
  }

  /** Confirms the Notifications page is ready. */
  async verifyNotificationsPage(notificationsPage: Page): Promise<void> {
    await expect(
      notificationsPage.getByRole("heading", {
        name: "Notifications",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 30_000 });
  }
}
