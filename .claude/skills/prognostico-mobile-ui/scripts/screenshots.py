"""
Capturas de tela do Prognóstico em vários tamanhos, percorrendo os fluxos reais.

Pré-requisitos:
  pip install playwright && python -m playwright install chromium
  npm run dev:fake -- --port 5173 --strictPort   (banco falso: não toca o Firebase real)

Uso:
  python .claude/skills/prognostico-mobile-ui/scripts/screenshots.py --out shots
  python .../screenshots.py --out shots --flows game,tutorial --sizes phone,landscape

Saída: PNGs em --out e um resumo com erros de console no final (exit 1 se houver erros).
"""
import argparse
import sys
import time
from pathlib import Path

from playwright.sync_api import Browser, Page, sync_playwright

SIZES = {
    "small": (360, 640, True),
    "phone": (390, 844, True),
    "landscape": (844, 390, True),
    "tablet": (768, 1024, True),
    "desktop": (1280, 800, False),
}

errors: list[str] = []


def attach(page: Page, tag: str) -> None:
    page.on("console", lambda m: m.type in ("error", "warning") and errors.append(f"[{tag}] {m.type}: {m.text[:300]}"))
    page.on("pageerror", lambda e: errors.append(f"[{tag}] PAGEERROR: {e}"))


def new_page(browser: Browser, size: str, tag: str) -> Page:
    w, h, touch = SIZES[size]
    ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if touch else 1,
                              has_touch=touch, is_mobile=touch)
    ctx.add_init_script("try{localStorage.setItem('prog.lang','pt')}catch(e){}")
    page = ctx.new_page()
    attach(page, f"{tag}/{size}")
    return page


def play_step(page: Page, touch: bool) -> str | None:
    """Executa a próxima ação disponível para o jogador local."""
    summary = page.locator("#round-summary")
    if summary.count():
        if "FIM DE JOGO" in summary.inner_text():
            return "game_over"
        btn = summary.locator("footer button")
        if btn.count() and btn.is_enabled():
            btn.click()
            return "round_ready"
        return None
    bids = page.locator("[id^=bid-btn-]")
    if bids.count():
        bids.first.click()
        return "bid"
    trick = page.locator("#trick-summary button")
    if trick.count() and trick.is_enabled():
        trick.click()
        return "trick_ready"
    cards = page.locator("#local-hand button:not([disabled])")
    if cards.count():
        card_id = cards.first.get_attribute("id")
        if touch:
            cards.first.tap()  # 1º toque seleciona
            page.wait_for_timeout(120)
            again = page.locator(f"#{card_id}")
            if again.count() and again.is_enabled():
                again.tap()  # 2º toque joga
        else:
            cards.first.click()
        return "play"
    return None


def create_offline(page: Page, bots: int, hand: int) -> None:
    page.goto(BASE)
    page.wait_for_timeout(600)
    page.fill("#player-name", "Teste")
    page.get_by_role("button", name="JOGAR OFFLINE (BOTS)").click()
    page.get_by_role("radio", name=str(bots + 1), exact=True).click()  # máx. jogadores
    for _ in range(hand):
        page.get_by_role("button", name="+").click()
    page.locator("form button[type=submit]").click()
    page.wait_for_timeout(300)
    for _ in range(bots):
        page.get_by_role("button", name="ADICIONAR BOT").click()
        page.wait_for_timeout(80)


def flow_game(browser: Browser, size: str, out: Path) -> None:
    touch = SIZES[size][2]
    page = new_page(browser, size, "game")
    page.goto(BASE)
    page.wait_for_timeout(600)
    page.screenshot(path=out / f"{size}-01-menu.png")
    create_offline(page, bots=3, hand=2)
    page.screenshot(path=out / f"{size}-02-waiting.png")
    page.get_by_role("button", name="INICIAR").click()
    seen: set[str] = set()
    probes = {
        "03-bid": "[id^=bid-btn-]",
        "04-play": "#local-hand button:not([disabled])",
        "05-trick": "#trick-summary",
        "06-round": "#round-summary",
    }
    start = time.time()
    while time.time() - start < 120:
        page.wait_for_timeout(250)
        for name, selector in probes.items():
            if name not in seen and page.locator(selector).count():
                seen.add(name)
                page.wait_for_timeout(400)
                page.screenshot(path=out / f"{size}-{name}.png")
        if play_step(page, touch) == "game_over":
            page.wait_for_timeout(500)
            page.screenshot(path=out / f"{size}-07-gameover.png")
            break
    page.context.close()


def flow_sheets(browser: Browser, size: str, out: Path) -> None:
    touch = SIZES[size][2]
    page = new_page(browser, size, "sheets")
    create_offline(page, bots=6, hand=0)
    page.get_by_role("button", name="INICIAR").click()
    start = time.time()
    # Espera ter histórico com a mesa visível (o placar da rodada é modal).
    while time.time() - start < 90 and not (
        page.locator("#history-btn").count() and not page.locator("#round-summary").count()
    ):
        page.wait_for_timeout(250)
        play_step(page, touch)
    page.screenshot(path=out / f"{size}-10-seven-players.png")
    page.locator("#history-btn").click()
    page.wait_for_timeout(300)
    page.screenshot(path=out / f"{size}-11-history.png")
    page.keyboard.press("Escape")
    page.locator("#help-btn").click()
    page.wait_for_timeout(300)
    page.screenshot(path=out / f"{size}-12-help.png")
    page.keyboard.press("Escape")
    page.get_by_role("button", name="Sair").click()
    page.wait_for_timeout(300)
    page.screenshot(path=out / f"{size}-13-exit.png")
    page.context.close()


def flow_tutorial(browser: Browser, size: str, out: Path) -> None:
    page = new_page(browser, size, "tutorial")
    page.goto(BASE)
    page.wait_for_timeout(600)
    page.get_by_role("button", name="APRENDER A JOGAR").click()
    actions = {5: "#bid-btn-2", 7: "#card-A-diamonds", 10: "#history-btn", 11: "#card-K-spades", 14: "#card-2-hearts"}
    for _ in range(40):
        page.wait_for_timeout(450)
        label = page.locator("text=/Tutorial \\d+\\/\\d+/").first.inner_text()
        step = int(label.split()[1].split("/")[0])
        page.screenshot(path=out / f"{size}-tut-{step:02d}.png")
        nxt = page.get_by_role("button", name="PRÓXIMO", exact=True)
        if nxt.count():
            nxt.click()
            continue
        end = page.get_by_role("button", name="ENCERRAR TUTORIAL")
        if end.count():
            end.click()
            break
        if step in actions:
            page.locator(actions[step]).click()
        page.wait_for_timeout(1200)
    page.wait_for_timeout(400)
    if not page.locator("#player-name").count():
        errors.append(f"[tutorial/{size}] o tutorial não voltou ao menu")
    page.context.close()


def flow_online(browser: Browser, size: str, out: Path) -> None:
    """Dois jogadores humanos (abas do mesmo navegador) + 1 bot, com recarga no meio."""
    w, h, touch = SIZES[size]
    ctx = browser.new_context(viewport={"width": w, "height": h}, has_touch=touch, is_mobile=touch)
    ctx.add_init_script("try{localStorage.setItem('prog.lang','pt')}catch(e){}")
    host, guest = ctx.new_page(), ctx.new_page()
    attach(host, f"host/{size}")
    attach(guest, f"guest/{size}")
    host.goto(BASE)
    guest.goto(BASE)
    host.wait_for_timeout(600)
    host.fill("#player-name", "Host")
    host.get_by_role("button", name="JOGAR ONLINE").click()
    host.get_by_role("button", name="CRIAR SALA").click()
    for _ in range(2):
        host.get_by_role("button", name="+").click()
    host.locator("form button[type=submit]").click()
    host.wait_for_timeout(700)
    code = host.locator("header p span").first.inner_text().strip()
    guest.fill("#player-name", "Convidado")
    guest.get_by_role("button", name="JOGAR ONLINE").click()
    guest.fill("input[placeholder='CÓDIGO DA SALA']", code)
    guest.get_by_role("button", name="ENTRAR").first.click()
    guest.wait_for_timeout(600)
    guest.get_by_role("button", name="ESTOU PRONTO").click()
    host.get_by_role("button", name="ADICIONAR BOT").click()
    host.wait_for_timeout(400)
    host.screenshot(path=out / f"{size}-20-online-waiting.png")
    host.get_by_role("button", name="INICIAR").click()
    reloaded = False
    start = time.time()
    guest_moves = 0
    while time.time() - start < 150:
        a, b = play_step(host, touch), play_step(guest, touch)
        guest_moves += 1 if b and b != "game_over" else 0
        if a == "game_over" and b == "game_over":
            break
        if not reloaded and guest_moves >= 3:
            guest.reload()
            guest.wait_for_timeout(1500)
            reloaded = True
            if not guest.locator("#local-hand, #round-summary").count():
                errors.append(f"[online/{size}] convidado não voltou para a mesa após recarregar")
            guest.screenshot(path=out / f"{size}-21-online-after-reload.png")
        host.wait_for_timeout(200)
    host.screenshot(path=out / f"{size}-22-online-end.png")
    ctx.close()


FLOWS = {"game": flow_game, "sheets": flow_sheets, "tutorial": flow_tutorial, "online": flow_online}

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # console do Windows (cp1252)
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base", default="http://127.0.0.1:5173/Progsnostico/")
    parser.add_argument("--out", default="screenshots")
    parser.add_argument("--flows", default="game,sheets,tutorial,online")
    parser.add_argument("--sizes", default="phone,landscape,desktop")
    args = parser.parse_args()

    BASE = args.base
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size in args.sizes.split(","):
            for flow in args.flows.split(","):
                print(f"-> {flow} @ {size}", flush=True)
                try:
                    FLOWS[flow](browser, size, out)
                except Exception as exc:  # noqa: BLE001 — queremos seguir com os outros fluxos
                    errors.append(f"[{flow}/{size}] FALHOU: {exc}")
        browser.close()

    print(f"\n{len(list(out.glob('*.png')))} capturas em {out.resolve()}")
    print(f"{len(errors)} erro(s)")
    for e in errors:
        print(" ", e)
    sys.exit(1 if errors else 0)
