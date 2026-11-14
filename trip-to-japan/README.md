# Trip to Japan

A multi-page responsive website for a travel agency that organises guided tours to Japan
(Tokyo, Kyoto, Osaka and Mount Fuji) for students and young travellers from Kazakhstan.

**Team:** Maqsat Nauanuly & Tolendi Arsen — Astana IT University

## Pages (9)

| Page | What it does |
|------|--------------|
| `index.html` | Home: hero with autocomplete search, animated counters, featured tours, subscribe popup |
| `tours.html` | Tours table: live search, city filter, sorting, star rating, save to profile (♥), book |
| `gallery.html` | Carousel + photo grid with category filter, search and lazy loading |
| `guide.html` | Travel Guide: live weather, yen converter and Japanese holidays from public APIs |
| `about.html` | Mission, team and FAQ accordion with search highlighting |
| `contact.html` | Booking form with full validation (saved to the profile when logged in) |
| `signup.html` | Sign Up: saves name, email, phone and password in localStorage |
| `login.html` | Log In: checks the saved credentials and redirects to the profile |
| `profile.html` | Profile: user details, edit profile, saved tours, bookings, log out, delete account |

## Final project requirements

| Requirement | Where |
|-------------|-------|
| Responsiveness | CSS Grid page layout, Flexbox, Bootstrap 5 grid; tours table turns into cards on phones |
| Light / Dark mode | Toggle in the navbar, saved in `localStorage` (`japanTheme`) and applied on every page |
| Authentication simulation | `signup.html` → `login.html` → `profile.html` (`localStorage`: `japanUsers`, `japanCurrentUser`) |
| Form validation | All forms use `novalidate` and JavaScript only: required fields, email format, password length + complexity, phone pattern; errors are shown under each field |
| Search / filter | Tours (search, filter, sort), Gallery (category + search), FAQ search, home autocomplete, weather city filter — choices are saved in `localStorage` |
| Animations | Button hover lift, icon spin, card hover, heart pop, star pop, skeleton loading, scroll progress bar, counters |
| External APIs | [Open-Meteo](https://open-meteo.com/) (weather), [ExchangeRate-API](https://www.exchangerate-api.com/) (yen rates), [Nager.Date](https://date.nager.at/) (holidays). All use `fetch` + `async/await` with a loading state and an error message with "Try again" |

## Folder structure

```
/trip-to-japan
├── index.html
├── tours.html
├── gallery.html
├── guide.html
├── about.html
├── contact.html
├── login.html
├── signup.html
├── profile.html
├── README.md
├── /css/style.css
├── /js/script.js
└── /images/
    ├── favicon.svg
    └── /icons/  (calendar, guide, plane, shield, support, user)
```

## Run locally

Open `index.html` in a browser, or run a small local server in the project folder:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Deploy to GitHub Pages

1. Create a new public repository on GitHub and upload all files from this folder
   (`index.html` must be in the root of the repository).
2. Open **Settings → Pages**.
3. Under **Build and deployment** choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and press **Save**.
4. After 1–2 minutes the site is live at `https://<username>.github.io/<repository>/`.

> Note: user accounts are only a simulation for this project. Passwords are stored in the
> browser's localStorage, which a real website must never do.
