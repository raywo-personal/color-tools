import {Component, provideZonelessChangeDetection, signal} from "@angular/core";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {readFileSync} from "node:fs";
import {beforeEach, describe, expect, it} from "vitest";
import {FontPicker} from "@common/components/font-picker/font-picker";
import {SelectedFont} from "@common/models/google-font.model";
import {fakeGoogleFonts, provideFakeGoogleFonts} from "@testing/google-fonts.fake";


@Component({
  imports: [FontPicker],
  template: `
    <ct-font-picker [font]="font()"
                    (fontChange)="picked($event)"/>
  `
})
class Host {

  readonly font = signal<SelectedFont | null>(null);
  readonly picks = signal<(SelectedFont | null)[]>([]);


  picked(font: SelectedFont | null): void {
    this.picks.update(picks => [...picks, font]);
    this.font.set(font);
  }

}


describe("FontPicker", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeGoogleFonts()]
    });
  });


  async function picker() {
    const fixture: ComponentFixture<Host> = TestBed.createComponent(Host);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const catalog = fakeGoogleFonts();

    function field(): HTMLInputElement {
      return host.querySelector("input[role=combobox]") as HTMLInputElement;
    }

    function listbox(): HTMLElement | null {
      return host.querySelector("[role=listbox]");
    }

    function options(): HTMLElement[] {
      return Array.from(host.querySelectorAll("[role=option]"));
    }

    function families(): string[] {
      return options().map(option => option.querySelector("span")?.textContent?.trim() ?? "");
    }

    function usage(): string {
      const describedBy = field().getAttribute("aria-describedby");

      return describedBy
        ? host.querySelector(`#${describedBy}`)?.textContent?.trim() ?? ""
        : "";
    }

    function status(): string {
      return host.querySelector("[role=status]")?.textContent?.trim() ?? "";
    }

    function button(caption: string): HTMLButtonElement | undefined {
      return Array.from(host.querySelectorAll("button"))
        .find(candidate => candidate.textContent?.trim() === caption);
    }

    async function settle() {
      await fixture.whenStable();
    }

    async function type(value: string) {
      const input = field();
      input.value = value;
      input.dispatchEvent(new Event("input"));
      await settle();
    }

    async function press(key: string) {
      field().dispatchEvent(new KeyboardEvent("keydown", {key, bubbles: true, cancelable: true}));
      await settle();
    }

    async function focus() {
      field().focus();
      await settle();
    }

    async function blur() {
      field().dispatchEvent(new Event("blur"));
      await settle();
    }

    async function click(element: Element) {
      element.dispatchEvent(new MouseEvent("click", {bubbles: true}));
      await settle();
    }

    return {
      fixture,
      host,
      catalog,
      picks: () => fixture.componentInstance.picks(),
      field,
      listbox,
      options,
      families,
      usage,
      status,
      button,
      settle,
      focus,
      type,
      press,
      blur,
      click
    };
  }


  it("names the field with the caption above it", async () => {
    const {host, field} = await picker();
    const label = host.querySelector("label");

    expect(label?.textContent?.trim()).toBe("TYPEFACE");
    expect(label?.getAttribute("for")).toBe(field().id);
  });


  it("names the app's own type while nothing is chosen", async () => {
    // The field is empty then, and nothing else on the screen says which type
    // the preview is running on.
    const {usage} = await picker();

    expect(usage()).toContain("IBM Plex Sans");
  });


  it("names the family the preview is set in, not the query being typed", async () => {
    const {type, press, usage} = await picker();

    await type("lobster");
    await press("Enter");
    await type("merri");

    expect(usage()).toBe("Set in Lobster.");
  });


  it("goes back to naming the app's own type after a clear", async () => {
    const {type, press, button, click, usage} = await picker();

    await type("lobster");
    await press("Enter");
    await click(button("CLEAR") as Element);

    expect(usage()).toContain("IBM Plex Sans");
  });


  it("keeps the app's own family name in step with the stylesheet", () => {
    // The name is a copy of the first family in `--font-sans`, which no
    // compiler compares against the control's own literal - so the stylesheet
    // is read and the two are pinned together.
    const styles = readFileSync("src/styles.css", "utf8");
    const declaration = /--font-sans:\s*"([^"]+)"/.exec(styles);

    expect(declaration, "src/styles.css declares no quoted --font-sans family").not.toBeNull();
    expect(`Set in ${declaration?.[1]}, the app's own type.`).toBe(
      "Set in IBM Plex Sans, the app's own type."
    );
  });


  it("says it is a closed combobox while nothing is open", async () => {
    const {field, listbox} = await picker();

    expect(field().getAttribute("role")).toBe("combobox");
    expect(field().getAttribute("aria-expanded")).toBe("false");
    expect(listbox()).toBeNull();
  });


  it("offers the head of the catalog when the list is opened on an empty field", async () => {
    // The catalog comes back sorted by popularity, so the first families are
    // the answer to "show me something" - an empty list would be the
    // alternative, and it says nothing.
    const {press, families} = await picker();

    await press("ArrowDown");

    expect(families()[0]).toBe("Roboto");
    expect(families()).toHaveLength(6);
  });


  it("offers the list on a click into the field, the way a select would", async () => {
    // Nothing on the control says "dropdown" other than what it does, so the
    // gesture a visitor tries first has to work.
    const {field, click, listbox} = await picker();

    await click(field());

    expect(listbox()).not.toBeNull();
  });


  it("narrows the list to what was typed", async () => {
    const {type, families} = await picker();

    await type("mono");

    expect(families()).toEqual(["Roboto Mono"]);
  });


  it("opens on the best hit, so Enter takes what was being typed out", async () => {
    const {type, press, field, options, picks} = await picker();

    await type("roboto");

    expect(field().getAttribute("aria-expanded")).toBe("true");
    expect(field().getAttribute("aria-activedescendant")).toBe(options()[0].id);

    await press("Enter");

    expect(picks()).toHaveLength(1);
    expect(picks()[0]?.family).toBe("Roboto");
  });


  it("picks a family further down the list with the keyboard", async () => {
    const {type, press, picks} = await picker();

    await type("roboto");
    await press("ArrowDown");
    await press("Enter");

    expect(picks()[0]?.family).toBe("Roboto Mono");
  });


  it("walks the list with the arrow keys and says which row it stands on", async () => {
    const {type, press, field, options} = await picker();

    await type("roboto");
    await press("ArrowDown");

    expect(field().getAttribute("aria-activedescendant")).toBe(options()[1].id);
    expect(options()[1].getAttribute("aria-selected")).toBe("true");
    expect(options()[0].getAttribute("aria-selected")).toBe("false");
  });


  it("wraps around the ends of the list", async () => {
    const {type, press, field, options} = await picker();

    await type("roboto");
    await press("ArrowUp");

    expect(field().getAttribute("aria-activedescendant")).toBe(options()[1].id);
  });


  it("jumps to the ends of the list with Home and End", async () => {
    const {press, field, options} = await picker();

    await press("ArrowDown");
    await press("End");

    expect(field().getAttribute("aria-activedescendant")).toBe(options().at(-1)?.id);

    await press("Home");

    expect(field().getAttribute("aria-activedescendant")).toBe(options()[0].id);
  });


  it("picks a family with the mouse", async () => {
    const {press, options, click, picks} = await picker();

    await press("ArrowDown");
    await click(options()[3]);

    expect(picks()[0]?.family).toBe("Roboto Mono");
  });


  it("carries the family's own weights into the selection", async () => {
    // The loader asks Google for exactly these, and the WEIGHT slider stands
    // on them - so a selection without them would put the preview back on a
    // synthesised weight.
    const {type, press, picks} = await picker();

    await type("open sans");
    await press("Enter");

    expect(picks()[0]?.weights).toEqual([300, 400, 600, 700, 800]);
  });


  it("closes the list once a family is taken and puts it in the field", async () => {
    const {type, press, field, listbox} = await picker();

    await type("lobster");
    await press("Enter");

    expect(listbox()).toBeNull();
    expect(field().value).toBe("Lobster");
    expect(field().getAttribute("aria-expanded")).toBe("false");
  });


  it("puts the selection back into the field when the visitor leaves mid-query", async () => {
    // The field mirrors the selection, so it must never be left showing a
    // family the app is not using.
    const {type, press, blur, field} = await picker();

    await type("lobster");
    await press("Enter");
    await type("merri");
    await blur();

    expect(field().value).toBe("Lobster");
  });


  it("offers the catalog again when the list is opened with a family chosen", async () => {
    // The field mirrors the selection, so the family in it is not a search for
    // it - a visitor changing their mind would otherwise be offered the one
    // family they already have.
    const {type, press, field, click, families} = await picker();

    await type("lobster");
    await press("Enter");
    await click(field());

    expect(families()[0]).toBe("Roboto");
    expect(families()).toHaveLength(6);
  });


  it("puts the chosen family under the next keystroke", async () => {
    // Typing into a field that already holds "Lobster" would otherwise append
    // to it, and nothing in the catalog matches what comes out.
    const {type, press, focus, field} = await picker();

    await type("lobster");
    await press("Enter");
    await focus();

    expect(field().selectionStart).toBe(0);
    expect(field().selectionEnd).toBe("Lobster".length);
  });


  it("says so when nothing matches, and claims no list while there is none", async () => {
    // The popup simply stays away, so without the message a visitor is left
    // waiting for a list that is never coming.
    const {type, field, listbox, status} = await picker();

    await type("zzzz");

    expect(listbox()).toBeNull();
    expect(field().getAttribute("aria-expanded")).toBe("false");
    expect(status()).toContain("No family matches");
  });


  it("closes on Escape without changing the selection", async () => {
    const {type, press, listbox, picks} = await picker();

    await type("roboto");
    await press("Escape");

    expect(listbox()).toBeNull();
    expect(picks()).toEqual([]);
  });


  it("clears back to the app's own type and hands focus to the field", async () => {
    const {type, press, button, field, click, picks} = await picker();

    await type("lobster");
    await press("Enter");

    const clear = button("CLEAR");
    expect(clear).toBeDefined();

    await click(clear as Element);

    expect(picks().at(-1)).toBeNull();
    expect(field().value).toBe("");
    expect(document.activeElement).toBe(field());
  });


  it("offers nothing to clear while nothing is chosen", async () => {
    const {button} = await picker();

    expect(button("CLEAR")?.disabled).toBe(true);
  });


  it("says so when the catalog does not answer, and stops taking input", async () => {
    const {catalog, settle, field, status} = await picker();

    catalog.fail();
    await settle();

    expect(status()).toContain("unavailable");
    expect(field().disabled).toBe(true);
  });


  it("asks for the catalog again on TRY AGAIN, and takes input once it arrives", async () => {
    const {catalog, settle, button, field, click, status} = await picker();

    catalog.fail();
    await settle();

    const retry = button("TRY AGAIN");
    expect(retry).toBeDefined();

    await click(retry as Element);
    expect(catalog.reloads).toBe(1);

    catalog.succeed();
    await settle();

    expect(status()).toBe("");
    expect(field().disabled).toBe(false);
    expect(button("TRY AGAIN")).toBeUndefined();
  });


  it("keeps TRY AGAIN under the visitor while the request it started is out", async () => {
    // `failed` goes false the moment the request is retried, so the button
    // would otherwise leave the document under the focus of the visitor who
    // just pressed it.
    const {catalog, settle, button, click} = await picker();

    catalog.fail();
    await settle();

    const retry = button("TRY AGAIN") as HTMLButtonElement;
    retry.focus();
    await click(retry);

    // What the resource does with a retry: the failure is gone, the answer is
    // not there yet.
    catalog.succeed();
    catalog.loading.set(true);
    await settle();

    expect(button("TRY AGAIN")).toBe(retry);
    expect(document.activeElement).toBe(retry);
    expect(retry.disabled).toBe(true);
  });


  it("hands focus to the field when a retry brings the catalog back", async () => {
    // TRY AGAIN leaves the document the moment the catalog arrives, and the
    // visitor who pressed it would be put back at the top of the page.
    const {catalog, settle, button, field, click} = await picker();

    catalog.fail();
    await settle();

    await click(button("TRY AGAIN") as Element);

    catalog.succeed();
    await settle();

    expect(button("TRY AGAIN")).toBeUndefined();
    expect(document.activeElement).toBe(field());
  });


  it("says it is loading and takes no input yet", async () => {
    const {catalog, settle, field, status} = await picker();

    catalog.loading.set(true);
    await settle();

    expect(status()).toContain("Loading");
    expect(field().disabled).toBe(true);
  });

});
