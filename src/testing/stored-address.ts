import {LOCAL_STORAGE_KEY, SettingsMap} from "@common/models/local-storage.model";
import {
  ContrastTypePage,
  contrastTypeAddressFrom,
  contrastTypePageFromAddress,
  isRestorableContrastTypeAddress
} from "@contrast-type/models/contrast-type-address.model";


/**
 * The page local storage holds, read back from its address - or null where
 * nothing readable is stored.
 *
 * The storage keeps the state as one address, so a spec asking what was
 * persisted asks this rather than parsing the entry itself.
 */
export function storedPage(): ContrastTypePage | null {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  const address = raw ? (JSON.parse(raw) as Partial<SettingsMap>).address ?? "" : "";

  return isRestorableContrastTypeAddress(address) ? contrastTypePageFromAddress(address) : null;
}


/** Puts a page into local storage the way the app writes it. */
export function storePage(page: ContrastTypePage, settings: Partial<SettingsMap> = {}): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({...settings, address: contrastTypeAddressFrom(page)}));
}
