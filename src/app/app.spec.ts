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


  it("renders the copy confirmation, which every screen copies through", async () => {
    // The shell renders it once, so a copy target neither imports nor
    // positions it. Nothing else would notice it going missing: the service
    // would still write and announce, and only the toast would be gone.
    configure(routes);

    const shell = await shellAt("/");

    expect(shell.querySelectorAll("ct-copy-confirmation")).toHaveLength(1);
  });


  it("leaves the app header out on an unknown path, because the not-found page carries its own", async () => {
    configure(routes);

    const shell = await shellAt("/does-not-exist");

    expect(shell.querySelector("header[ct-app-header]")).toBeNull();
  });


  it("renders the app header for a route that says nothing about it", async () => {
    // Both real routes name a component of their own, so the default is
    // pinned against a route table of this test's own: a screen needs no
    // entry to be framed correctly.
    configure([
      {path: "says-nothing", component: Placeholder}
    ]);

    const shell = await shellAt("/says-nothing");

    expect(shell.querySelector("header[ct-app-header]")).not.toBeNull();
  });

});
