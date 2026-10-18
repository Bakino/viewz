import { RouterZ, constants } from "../lib/routerz.mjs";

describe('RouterZ navigateTo (stackers)', () => {
  let router;

  // Not started: no history listener, so navigateTo only builds and pushes the URL.
  beforeEach(() => {
    router = new RouterZ({ type: constants.MEMORY });
  });

  test('should add the first stack after the current route', async () => {
    router.historyPush('/pump');

    await router.navigateTo('/*_*/popup/1');

    expect(router.getCurrentLocation().pathname).toBe('/pump/*_*/popup/1');
  });

  test('should stack a nested stack after the last open level', async () => {
    router.historyPush('/pump/*_*/popup/1');

    await router.navigateTo('/*_*/confirm');

    // the intermediate level must stay in the URL, otherwise _change() sees it as closed
    expect(router.getCurrentLocation().pathname).toBe('/pump/*_*/popup/1/*_*/confirm');
  });

  test('should keep stacking on every new level', async () => {
    router.historyPush('/pump/*_*/popup/1/*_*/confirm');

    await router.navigateTo('/*_*/deeper');

    expect(router.getCurrentLocation().pathname).toBe('/pump/*_*/popup/1/*_*/confirm/*_*/deeper');
  });
});
