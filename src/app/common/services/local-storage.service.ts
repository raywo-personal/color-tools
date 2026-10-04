import {Service} from "@angular/core";
import {EMPTY_SETTINGS, LOCAL_STORAGE_KEY, SettingKey, SettingsMap} from "@common/models/local-storage.model";
import {BehaviorSubject} from "rxjs";


@Service()
export class LocalStorage {

  private readonly settings =
    new Map<SettingKey, BehaviorSubject<SettingsMap[SettingKey] | undefined>>();


  constructor() {
    this.initSettings();
  }


  public set<K extends SettingKey>(key: K, value: SettingsMap[K]): void {
    const currentSettings = this.getAllSettings();
    const newSettings: Partial<SettingsMap> = {
      ...currentSettings,
      [key]: value
    };

    this.saveAllSettings(newSettings);
    this.settings.get(key)?.next(value);
  }


  public get<K extends SettingKey>(key: K): SettingsMap[K] | null {
    return this.getAllSettings()[key] ?? null;
  }


  public getOrDefault<K extends SettingKey>(key: K,
                                            fallback: SettingsMap[K]): SettingsMap[K] {
    const v = this.get(key);
    return v ?? fallback;
  }


  public clearSettings(): void {
    localStorage.clear();
    this.initSettings();
  }


  /**
   * An unreadable entry falls back to the defaults rather than throwing.
   * `initSettings()` runs from the constructor and `loadAppStateReducer`
   * injects this service, so a throw here leaves the visitor without an app at
   * all - a blank viewport, not a wrong theme. The boot script in
   * `index.html` makes the same promise for the same reason.
   */
  private getAllSettings(): Partial<SettingsMap> {
    const storedSettings = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!storedSettings) return EMPTY_SETTINGS;

    try {
      return JSON.parse(storedSettings) as Partial<SettingsMap>;
    } catch {
      return EMPTY_SETTINGS;
    }
  }


  private saveAllSettings(settings: Partial<SettingsMap>): void {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  }


  private initSettings(): void {
    const currentSettings = this.getAllSettings();

    Object.keys(EMPTY_SETTINGS).forEach(key => {
      const typedKey = key as SettingKey;
      this.settings.set(typedKey, new BehaviorSubject(currentSettings[typedKey]));
    });
  }

}
