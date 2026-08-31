import {TestBed} from "@angular/core/testing";
import {provideRouter, Router, Routes} from "@angular/router";
import {Component, provideZonelessChangeDetection} from "@angular/core";
import {describe, expect, it} from "vitest";
import {App} from "./app";
import {routes} from "./app.routes";


@Component({template: ""})
class Placeholder {
}


describe("App", () => {

  function configure(routeTable: Routes) {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routeTable)
      ]
    });
  }


  async function shellAt(path: string) {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(path);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  }


  it("renders the app header on a view", async () => {
    configure(routes);

    const shell = await shellAt("/");

    expect(shell.querySelector("header[ct-app-header]")).not.toBeNull();
  });


  it("renders the app header on an unknown path, because the not-found page has none", async () => {
    configure(routes);

    const shell = await shellAt("/does-not-exist");

    expect(shell.querySelector("header[ct-app-header]")).not.toBeNull();
  });


  it("leaves the app header out where a route opts out of it", async () => {
    // No route in `app.routes.ts` opts out while the not-found page has no
    // header of its own, so the mechanism is pinned against a route table of
    // this test's own.
    configure([
      {path: "carries-its-own", component: Placeholder, data: {appHeader: false}}
    ]);

    const shell = await shellAt("/carries-its-own");

    expect(shell.querySelector("header[ct-app-header]")).toBeNull();
  });

});
