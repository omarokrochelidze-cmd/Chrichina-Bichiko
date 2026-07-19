# ჭრიჭინა · Chrichina

**დააჭირე და გეჭიროს — წყალი იღვრება, კოეფიციენტი იზრდება. აუშვი, სანამ გაიყინება.**
*Press and hold to pour, release to cash out — before it freezes.*

[**▶ ითამაშე / Play the demo**](https://omarokrochelidze-cmd.github.io/Chrichina-Bichiko/)

![ჭრიჭინა — წვიმის მდგომარეობა](docs/pour.webp)

> **დემო ვერსიაა.** ბალანსი ვირტუალურია, ნამდვილი ფული არ მონაწილეობს და გადახდის
> არანაირი ინტეგრაცია არ არსებობს.
> **This is a demo.** The balance is virtual — no real money, no payment integration.

---

<details open>
<summary><b>🇬🇪 ქართული</b></summary>

## რა არის ეს

ჭრიჭინა არის *crash*-ტიპის ფსონის თამაშის დემო, „დააჭირე და გეჭიროს" მექანიკით.
ღილაკზე თითის დაჭერისას კაცს თავზე წყალი ეღვრება და კოეფიციენტი ექსპონენციალურად
იზრდება. რაც მეტხანს გეჭირავს, მით მეტი მოგება — მაგრამ ყოველ წამს არსებობს შანსი,
რომ ყველაფერი გაიყინოს და ფსონი დაიკარგოს.

**დამოკიდებულებების და build-ის გარეშე.** არც npm, არც bundler, არც framework —
სამი ფაილი და სურათების საქაღალდე. გასახსნელად უბრალოდ ორმაგად დააწკაპუნე
`chrichina.html`-ზე.

## როგორ ვითამაშო

1. აირჩიე ფსონი ისრებით (▲ ▼ ან ◀ ▶ ტელეფონზე).
2. **დააჭირე და გეჭიროს** მთავარ ღილაკს — კოეფიციენტი იზრდება.
3. **აუშვი** ღილაკი, სანამ გაიყინება — მოგება ბალანსში ჩაგივარდება.
4. თუ დააგვიანე, კაცი ყინულში ექცევა და ფსონი იკარგება.

კლავიატურაზე **Space** იგივეს აკეთებს, რასაც ღილაკზე დაჭერა.
გაყინვის შემდეგ ცალკე „restart" ღილაკი არ არის — უბრალოდ კვლავ დააჭირე.

## გაშვება

```
გახსენი chrichina.html ბრაუზერში (ორმაგი დაწკაპუნება ან ტაბში ჩაგდება)
```

რედაქტირება = შენახვა + განახლება. `scenes/` საქაღალდე HTML-ის გვერდით უნდა იდოს.

## მდგომარეობები

| | | |
|:--:|:--:|:--:|
| ![idle](docs/idle.webp) | ![pour](docs/pour.webp) | |
| **მოლოდინი** — რაუნდი არ დაწყებულა | **დენა** — კოეფიციენტი იზრდება | |
| ![win](docs/win.webp) | ![frozen](docs/frozen.webp) | |
| **მოგება** — მოასწარი და აუშვი | **გაყინვა** — ფსონი დაიკარგა | |

<img src="docs/portrait.webp" width="300" alt="portrait">

ტელეფონზე განლაგება გადაეწყობა: ფსონი და Cash Out ღილაკის ზემოთ სვეტად დგება.

## სტრუქტურა

| ფაილი | რას შეიცავს |
|---|---|
| `chrichina.html` | მარკაპი — `#game`-ის ხე და მოდალები |
| `chrichina.css` | დისკრეტული ვიზუალი — მდგომარეობის კლასები, crossfade, წვიმა, portrait |
| `chrichina.js` | ერთი IIFE — მდგომარეობათა მანქანა, ეკონომიკა, ნაწილაკები, ხმა |
| `scenes/` | ოთხი ფონი (`.webp`) და ორი ატმოსფერული ლუპი (`.mp4`) |

გაყოფა **კონცეფციითაა და არა ფაილის ტიპით**: სცენარიანი, დისკრეტული ეფექტები
(ყინვა, ბეჭედი, წვიმის ფენები) CSS-კლასებზეა მიბმული, უწყვეტი და კადრობრივი
ვიზუალი (კოეფიციენტი, ცახცახი, გამჭვირვალობები) კი `render()`-ში იწერება.

## ტექნიკური დეტალები

- **მდგომარეობათა მანქანა:** `idle → pour → recover | frozen`. დაჭერა ახალ რაუნდს
  იწყებს ნებისმიერი მდგომარეობიდან, გარდა `pour`-ისა.
- **მათემატიკა:** `mult = e^(0.5·t)`, crash-განაწილება Aviator-ის სტილისაა
  (~3% მყისიერი, სხვა შემთხვევაში `0.97/(1−r)`, ჭერი ×60 ≈ 8.2 წამი).
- **ნაწილაკები:** ერთი 2D canvas, `devicePixelRatio`-ზე დამასშტაბებული ბუფერით;
  სამი ემიტერი (წვიმა / თოვლი / ნაპერწკლები), ჭერი 1200 ნაწილაკზე.
- **ხმა:** WebAudio, ერთი ოსცილატორის helper-იდან აწყობილი; პირველი ჟესტის შემდეგ
  ეშვება, პარამეტრებში ითიშება.
- **სცენები** ერთი 2×2 ბადის სახით დაგენერირდა და გაიჭრა — ამიტომ სახლი, კაცი,
  ქალი და კამერა ოთხივე კადრში იდენტურია და crossfade არ „ხტება".

## ასეტები

`scenes/`-ის ფონები და ვიდეო-ლუპები **AI-ით არის დაგენერირებული**. MIT ლიცენზია
ვრცელდება **კოდზე**; სურათებისა და ვიდეოების ხელახლა გამოყენებამდე გაითვალისწინე,
რომ მათი სამართლებრივი სტატუსი კოდისგან განსხვავებულია.

</details>

<details>
<summary><b>🇬🇧 English</b></summary>

## What this is

Chrichina (ჭრიჭინა) is a demo of a *crash*-style betting game built around a
press-and-hold mechanic. Holding the button pours water over the man and grows a
multiplier exponentially. The longer you hold the more you win — but every moment
carries a chance that everything freezes and the stake is lost.

**No dependencies, no build step.** No npm, no bundler, no framework — three files
and an asset folder. Just double-click `chrichina.html`.

## How to play

1. Pick a stake with the arrows (▲ ▼, or ◀ ▶ on mobile).
2. **Press and hold** the main button — the multiplier climbs.
3. **Release** before it freezes, and the win lands in your balance.
4. Hold too long and the man is encased in ice; the stake is gone.

**Space** does the same thing as pressing the button. There is no separate restart
button after a freeze — just press again.

## Running it

```
Open chrichina.html in a browser (double-click, or drag it into a tab)
```

Editing = save + refresh. Keep the `scenes/` folder next to the HTML.

## Structure

| File | Contents |
|---|---|
| `chrichina.html` | Markup — the `#game` tree and modals |
| `chrichina.css` | Discrete visuals — state classes, crossfade, rain, portrait layout |
| `chrichina.js` | One IIFE — state machine, economy, particles, sound |
| `scenes/` | Four backgrounds (`.webp`) and two ambient loops (`.mp4`) |

The split is **by concern, not by file type**: scripted, discrete effects (frost,
the stamp, rain layers) hang off CSS classes, while continuous per-frame visuals
(multiplier, shiver, opacities) are written in `render()`.

## Technical notes

- **State machine:** `idle → pour → recover | frozen`. A press starts a new round
  from any state except `pour`.
- **Math:** `mult = e^(0.5·t)`, with an Aviator-style crash distribution (~3%
  instant, otherwise `0.97/(1−r)`, capped at ×60 ≈ 8.2 s).
- **Particles:** a single 2D canvas with a `devicePixelRatio`-scaled buffer; three
  emitters (rain / snow / sparkles), hard-capped at 1200 particles.
- **Sound:** WebAudio built from one oscillator helper, started after the first
  gesture and toggleable in settings.
- **Scenes** were generated as a single 2×2 grid and split, which is what keeps the
  house, the man, the woman and the camera identical across all four — so the
  crossfade never reads as a jump cut.

## Assets

The backgrounds and video loops in `scenes/` are **AI-generated**. The MIT license
covers the **code**; if you reuse the imagery, note that its legal status differs
from that of the code.

</details>

---

<sub>UI ტექსტი ქართულია · UI text is in Georgian · MIT © 2026 Omar Okrochelidze</sub>
