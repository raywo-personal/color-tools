import {TestBed} from "@angular/core/testing";
import {provideRouter, Router} from "@angular/router";
import {provideZonelessChangeDetection} from "@angular/core";
import {beforeEach, describe, expect, it} from "vitest";
import {App} from "./app";
import {routes} from "./app.routes";


describe("App", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes)
      ]
    });
  });


  async function shellAt(path: string) {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(path);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  }


  it("renders the app header on a view", async () => {
    const shell = await shellAt("/");

    expect(shell.querySelector("header")).not.toBeNull();
  });


  it("leaves the app header out where the route opts out of it", async () => {
    const shell = await shellAt("/does-not-exist");

    expect(shell.querySelector("header[ct-app-header]")).toBeNull();
  });

});
