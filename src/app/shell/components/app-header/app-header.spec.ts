import {TestBed} from "@angular/core/testing";
import {provideRouter, Router} from "@angular/router";
import {provideZonelessChangeDetection} from "@angular/core";
import {beforeEach, describe, expect, it} from "vitest";
import {AppHeader} from "@shell/components/app-header/app-header";


describe("AppHeader", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        // Only the paths matter here: the tabs read the url, not the route
        // table. `app.routes.spec.ts` pins that these paths exist.
        provideRouter([
          {path: "", pathMatch: "full", children: []},
          {path: "contrast", children: []},
          {path: "**", children: []}
        ])
      ]
    });
  });


  async function headerAt(path: string) {
    await TestBed.inject(Router).navigateByUrl(path);

    const fixture = TestBed.createComponent(AppHeader);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  }


  function tabs(header: HTMLElement) {
    return Array.from(header.querySelectorAll("nav a"));
  }


  it("links the two tabs to the two views", async () => {
    const header = await headerAt("/");

    const hrefs = tabs(header).map(tab => tab.getAttribute("href"));

    expect(hrefs).toEqual(["/", "/contrast"]);
  });


  it("marks the studio tab on the start page", async () => {
    const header = await headerAt("/");
    const [studio, contrast] = tabs(header);

    expect(studio.getAttribute("aria-current")).toBe("page");
    expect(contrast.getAttribute("aria-current")).toBeNull();
  });


  it("marks the contrast tab on the contrast path", async () => {
    const header = await headerAt("/contrast");
    const [studio, contrast] = tabs(header);

    expect(studio.getAttribute("aria-current")).toBeNull();
    expect(contrast.getAttribute("aria-current")).toBe("page");
  });


  it("marks neither tab on an unknown path", async () => {
    const header = await headerAt("/does-not-exist");

    expect(tabs(header).every(tab => tab.getAttribute("aria-current") === null)).toBe(true);
  });


  it("links to the repository", async () => {
    const header = await headerAt("/");

    const repositoryLink = Array.from(header.querySelectorAll("a"))
      .find(anchor => anchor.getAttribute("href")?.startsWith("https://"));

    expect(repositoryLink?.getAttribute("href")).toBe("https://github.com/raywo-personal/color-tools");
  });


  it("names the repository link, because its label is a logo", async () => {
    const header = await headerAt("/");

    const repositoryLink = Array.from(header.querySelectorAll("a"))
      .find(anchor => anchor.getAttribute("href")?.startsWith("https://"));

    expect(repositoryLink?.getAttribute("aria-label")).toBe("ColorTools on GitHub");
    expect(repositoryLink?.textContent?.trim()).toBe("");
    expect(repositoryLink?.querySelector("svg")).not.toBeNull();
  });

});
