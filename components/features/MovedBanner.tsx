"use client";

import { useEffect, useState } from "react";
import { exportAllData } from "@/lib/dataBackup";
import { isOldAddress, NEW_SITE_URL, NEW_SITE_HOST } from "@/lib/siteAddress";

/**
 * "Wealth Copilot has moved" banner, shown at the very top of every page
 * — but only when the app is opened at the old address (see
 * lib/siteAddress.ts for why that address isn't simply redirected). The
 * hostname check runs in the browser after mount, so the server render
 * (which can't know the address) always renders nothing and hydration
 * never mismatches.
 */
export function MovedBanner() {
  const [show, setShow] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    setShow(isOldAddress(window.location.hostname));
  }, []);

  if (!show) return null;

  return (
    <div className="moved-banner no-print" role="region" aria-label="Wealth Copilot has moved">
      <div className="moved-banner-inner">
        <p>
          <b>Wealth Copilot has moved to </b>
          <a href={NEW_SITE_URL}>
            <b>{NEW_SITE_HOST}</b>
          </a>
          <b>.</b> To bring your saved data with you, click <b>Download My Data</b> here, then open the new address and
          use <b>Restore</b>.
        </p>
        <div className="moved-banner-actions">
          <button
            type="button"
            className="btn gold"
            onClick={() => {
              exportAllData();
              setDownloaded(true);
            }}
          >
            ⬇ Download My Data
          </button>
          <a className="btn ghost moved-banner-link" href={NEW_SITE_URL}>
            Go to {NEW_SITE_HOST} →
          </a>
        </div>
        {downloaded && (
          <p className="moved-banner-note" role="status">
            Downloaded. Now open{" "}
            <a href={NEW_SITE_URL}>
              <b>{NEW_SITE_HOST}</b>
            </a>{" "}
            and use <b>Restore from a file</b> on the Home page.
          </p>
        )}
      </div>
    </div>
  );
}
