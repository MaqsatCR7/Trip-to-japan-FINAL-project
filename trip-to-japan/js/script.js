/* =====================================================
   Trip to Japan | script.js
   One file linked in every HTML page.
   Each feature first checks that its elements exist on
   the current page, so nothing breaks on other pages.

   Contents:
   1. localStorage helpers and authentication simulation
   2. Form validation (booking, sign up, log in, profile)
   3. FAQ accordion, popup, background color, date/time
   4. Sound effects, light/dark mode, keyboard navigation
   5. Tours: data, filter, sort, rating, favourites
   6. jQuery features: search, autocomplete, toasts,
      scroll progress, counters, copy buttons, lazy loading
   7. Profile page, gallery filter, external APIs
   ===================================================== */


/* =====================================================
   LOCALSTORAGE HELPERS
   Every value the website remembers is saved under one
   of these keys. JSON is used, so arrays and objects
   can be stored too.
   ===================================================== */
var STORAGE_KEYS = {
    users: "japanUsers",                 // array of registered users
    session: "japanCurrentUser",         // email of the logged-in user
    lastEmail: "japanLastEmail",         // pre-fills the login form after sign up
    tourFilter: "japanTourFilter",       // tours.html: chosen city button
    tourSearch: "japanTourSearch",       // tours.html: search text
    tourSort: "japanTourSort",           // tours.html: sort order
    ratings: "japanTourRatings",         // tours.html: star ratings { tourId: stars }
    galleryFilter: "japanGalleryFilter", // gallery.html: chosen category
    gallerySearch: "japanGallerySearch", // gallery.html: search text
    weatherCity: "japanWeatherCity",     // guide.html: weather city filter
    currency: "japanCurrency"            // guide.html: last converter currency and amount
};

function readStorage(key, fallback) {
    try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
        return fallback;   // broken value or storage blocked by the browser
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) { /* storage is full or blocked: the page still works */ }
}


/* =====================================================
   AUTHENTICATION SIMULATION (no backend)
   Users are saved in localStorage as an array of objects:
   { name, email, phone, password, createdAt, favorites: [], bookings: [] }
   NOTE: this only simulates a login for the university
   project. A real website must keep passwords on a server.
   ===================================================== */
function getUsers() {
    return readStorage(STORAGE_KEYS.users, []);
}

function saveUsers(users) {
    writeStorage(STORAGE_KEYS.users, users);
}

function findUserByEmail(email) {
    var wanted = String(email).trim().toLowerCase();
    return getUsers().find(function (user) { return user.email === wanted; }) || null;
}

function getCurrentUser() {
    var email = readStorage(STORAGE_KEYS.session, null);
    return email ? findUserByEmail(email) : null;
}

// Changes the logged-in user and saves the whole list again
function updateCurrentUser(changeUser) {
    var email = readStorage(STORAGE_KEYS.session, null);
    var users = getUsers();
    var user = users.find(function (item) { return item.email === email; });
    if (!user) return null;

    changeUser(user);
    saveUsers(users);
    return user;
}

function logIn(email) {
    writeStorage(STORAGE_KEYS.session, email.trim().toLowerCase());
}

function logOut() {
    localStorage.removeItem(STORAGE_KEYS.session);
}

function getFirstName(name) {
    return String(name).trim().split(/\s+/)[0];
}

// "Aruzhan Bekova" -> "AB"
function getInitials(name) {
    return String(name).trim().split(/\s+/).slice(0, 2).map(function (part) {
        return part.charAt(0).toUpperCase();
    }).join("");
}

// "7012345678" -> "+7 701 234 56 78"
function formatPhone(digits) {
    if (!digits || digits.length !== 10) return digits || "";
    return "+7 " + digits.slice(0, 3) + " " + digits.slice(3, 6) + " " + digits.slice(6, 8) + " " + digits.slice(8);
}

// "7012345678" -> "701 234 56 78" (the +7 is already shown before the input)
function formatPhoneLocal(digits) {
    return formatPhone(digits).replace("+7 ", "");
}

function formatDate(value) {
    var date = new Date(value);
    if (isNaN(date)) return "";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// Updates the "Log In" link in the navbar on every page
function initAuthNav() {
    var link = document.getElementById("authLink");
    if (!link) return;

    var user = getCurrentUser();
    if (user) {
        link.href = "profile.html";
        link.title = "My profile";
        link.innerHTML = '<span class="nav-avatar">' + escapeHtml(getInitials(user.name)) + "</span>" +
                         escapeHtml(getFirstName(user.name));
    } else {
        link.href = "login.html";
        link.removeAttribute("title");
        link.textContent = "Log In";
    }
}


/* =====================================================
   FORM VALIDATION (every form on the website)
   - Browser validation is off (novalidate on <form>), and
     no HTML attributes like required / pattern are used.
   - Each check function returns an error message,
     or an empty string "" when the value is correct.
   - Errors are shown under the field, not in alerts.
   ===================================================== */
var EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
var PHONE_PATTERN = /^7\d{9}$/;   // Kazakhstan mobile number after +7, e.g. 701 234 56 78
var NAME_PATTERN = /^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі\s'-]+$/;

// Password complexity rules (also used by the live checklist on signup.html)
var PASSWORD_RULES = [
    { id: "length",  text: "8 to 32 characters",  test: function (v) { return v.length >= 8 && v.length <= 32; } },
    { id: "upper",   text: "an uppercase letter", test: function (v) { return /[A-Z]/.test(v); } },
    { id: "lower",   text: "a lowercase letter",  test: function (v) { return /[a-z]/.test(v); } },
    { id: "digit",   text: "a number",            test: function (v) { return /\d/.test(v); } },
    { id: "special", text: "a symbol (!@#$...)",  test: function (v) { return /[^A-Za-z0-9\s]/.test(v); } }
];

// Removes spaces, brackets, dashes and the country code: "+7 (701) 234-56-78" -> "7012345678"
function cleanPhone(value) {
    var digits = String(value).replace(/[\s()-]/g, "");
    if (digits.indexOf("+7") === 0) {
        digits = digits.slice(2);
    } else if (digits.length === 11 && (digits.charAt(0) === "8" || digits.charAt(0) === "7")) {
        digits = digits.slice(1);
    }
    return digits;
}

function checkName(value) {
    var name = value.trim();
    if (name === "") return "Full name is required.";
    if (name.length < 2) return "Name must be at least 2 characters long.";
    if (name.length > 50) return "Name must be 50 characters or less.";
    if (!NAME_PATTERN.test(name)) return "Name can contain only letters, spaces, hyphens and apostrophes.";
    return "";
}

function checkEmail(value) {
    var email = value.trim();
    if (email === "") return "Email address is required.";
    if (!EMAIL_PATTERN.test(email)) return "Please enter a valid email, e.g. name@example.com.";
    return "";
}

function checkPhone(value) {
    var phone = value.trim();
    if (phone === "") return "Phone number is required.";
    if (/[^\d\s()+-]/.test(phone)) return "Phone number can contain only digits.";
    if (!PHONE_PATTERN.test(cleanPhone(phone))) return "Enter 10 digits starting with 7, e.g. 701 234 56 78.";
    return "";
}

function checkPassword(value) {
    if (value === "") return "Password is required.";
    var missing = PASSWORD_RULES.filter(function (rule) { return !rule.test(value); })
                                .map(function (rule) { return rule.text; });
    if (missing.length > 0) return "Password needs " + missing.join(", ") + ".";
    return "";
}

function checkConfirmPassword(value, password) {
    if (value === "") return "Please confirm your password.";
    if (value !== password) return "Passwords do not match.";
    return "";
}

// Shows a red error message under the field (the element with id = input id + "Error")
function showError(input, message) {
    var errorBox = document.getElementById(input.id + "Error");
    input.classList.add("input-error");
    input.classList.remove("input-ok");
    input.setAttribute("aria-invalid", "true");
    if (errorBox) errorBox.textContent = message;
}

// Removes the error and marks the field as correct
function showSuccess(input) {
    var errorBox = document.getElementById(input.id + "Error");
    input.classList.remove("input-error");
    input.classList.add("input-ok");
    input.removeAttribute("aria-invalid");
    if (errorBox) errorBox.textContent = "";
}

// Shows the result of one check. Returns true when the field is correct.
function applyCheck(input, message) {
    if (message) {
        showError(input, message);
        return false;
    }
    showSuccess(input);
    return true;
}

/* Connects validation to a list of fields.
   fields: [{ id: "signupEmail", check: function (value) { return checkEmail(value); } }]
   - a field is checked when the user leaves it (blur / change)
   - a field with an error is checked again while typing
   Returns an object with validateAll() and clear(). */
function setupValidation(fields) {
    function validateField(field) {
        var input = document.getElementById(field.id);
        var value = input.type === "checkbox" ? input.checked : input.value;
        return applyCheck(input, field.check(value, input));
    }

    fields.forEach(function (field) {
        var input = document.getElementById(field.id);
        var leaveEvent = (input.type === "checkbox" || input.tagName === "SELECT" || input.type === "date") ? "change" : "blur";

        input.addEventListener(leaveEvent, function () { validateField(field); });
        input.addEventListener("input", function () {
            if (input.classList.contains("input-error")) validateField(field);
        });
    });

    return {
        validateAll: function () {
            var allValid = true;
            var firstWrong = null;
            fields.forEach(function (field) {
                if (!validateField(field)) {
                    allValid = false;
                    if (!firstWrong) firstWrong = document.getElementById(field.id);
                }
            });
            if (firstWrong) firstWrong.focus();   // move the user to the first problem
            return allValid;
        },
        clear: function () {
            fields.forEach(function (field) {
                var input = document.getElementById(field.id);
                input.classList.remove("input-error", "input-ok");
                input.removeAttribute("aria-invalid");
                var errorBox = document.getElementById(field.id + "Error");
                if (errorBox) errorBox.textContent = "";
            });
        }
    };
}

// "Show / Hide" buttons next to password fields
function initPasswordToggles() {
    document.querySelectorAll(".pw-toggle").forEach(function (button) {
        button.addEventListener("click", function () {
            var input = document.querySelector(button.dataset.toggleTarget);
            var isHidden = input.type === "password";
            input.type = isHidden ? "text" : "password";
            button.textContent = isHidden ? "Hide" : "Show";
            button.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
        });
    });
}

// Live password strength meter and checklist (signup.html)
function initPasswordMeter(inputId) {
    var input = document.getElementById(inputId);
    var bar = document.getElementById("pwMeterBar");
    if (!input || !bar) return;

    input.addEventListener("input", function () {
        var value = input.value;
        var passed = 0;

        PASSWORD_RULES.forEach(function (rule) {
            var ok = rule.test(value);
            if (ok) passed++;
            var item = document.querySelector('#pwRules li[data-rule="' + rule.id + '"]');
            if (item) item.classList.toggle("ok", ok);
        });

        bar.style.width = value === "" ? "0" : (passed / PASSWORD_RULES.length * 100) + "%";
        bar.className = passed <= 2 ? "weak" : (passed <= 4 ? "medium" : "strong");
    });
}


/* =====================================================
   BOOKING FORM (contact.html)
   Required: name, email, tour, phone, travel date and
   number of travellers. The tour can come from the link,
   e.g. contact.html?tour=kyoto. A logged-in user gets
   the fields filled in and the booking saved in the profile.
   ===================================================== */
var TOUR_LABELS = {
    tokyo: "Tokyo Explorer",
    kyoto: "Kyoto Heritage",
    osaka: "Osaka Food & Lights",
    fuji: "Mount Fuji Nature"
};

function checkTravelDate(value) {
    if (value === "") return "Please choose your travel date.";
    var date = new Date(value + "T00:00:00");
    if (isNaN(date)) return "Please enter a valid date.";

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var oneYearLater = new Date(today);
    oneYearLater.setFullYear(today.getFullYear() + 1);

    if (date <= today) return "Travel date must be in the future.";
    if (date > oneYearLater) return "We accept bookings up to one year ahead.";
    return "";
}

function checkTravelers(value) {
    var text = value.trim();
    if (text === "") return "Number of travellers is required.";
    if (!/^\d+$/.test(text)) return "Please enter a whole number, e.g. 2.";
    var count = Number(text);
    if (count < 1 || count > 10) return "A group can have from 1 to 10 travellers.";
    return "";
}

function checkMessage(value) {
    if (value.trim().length > 500) return "Message is too long (500 characters maximum).";
    return "";
}

// Sends the form data with fetch (POST) without reloading the page.
// jsonplaceholder.typicode.com is a free test API: it only imitates saving.
function sendBookingRequest(data, onSuccess, onError) {
    fetch("https://jsonplaceholder.typicode.com/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(data)
    })
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Server error: " + response.status);
            }
            return response.json();
        })
        .then(function (result) {
            onSuccess(result);
        })
        .catch(function (error) {
            onError(error);
        });
}

function initFormValidation() {
    var form = document.getElementById("bookingForm");
    if (!form) return;

    var successBox = document.getElementById("formSuccess");
    var errorBox = document.getElementById("formError");
    var submitButton = document.getElementById("submitBtn");
    var hint = document.getElementById("bookingLoginHint");

    var validator = setupValidation([
        { id: "name", check: checkName },
        { id: "email", check: checkEmail },
        { id: "city", check: function (value) { return value === "" ? "Please select a tour." : ""; } },
        { id: "phone", check: checkPhone },
        { id: "travelDate", check: checkTravelDate },
        { id: "travelers", check: checkTravelers },
        { id: "msg", check: checkMessage }
    ]);

    // Choose the tour from the link: contact.html?tour=kyoto
    var tourFromLink = new URLSearchParams(window.location.search).get("tour");
    if (tourFromLink && TOUR_LABELS[tourFromLink]) {
        document.getElementById("city").value = tourFromLink;
    }

    // Fill in the details of the logged-in user
    function fillUserDetails() {
        var user = getCurrentUser();
        if (!user) return;
        document.getElementById("name").value = user.name;
        document.getElementById("email").value = user.email;
        document.getElementById("phone").value = formatPhoneLocal(user.phone);
    }

    var currentUser = getCurrentUser();
    fillUserDetails();
    hint.innerHTML = currentUser
        ? "Logged in as <strong>" + escapeHtml(currentUser.name) + "</strong>. This booking will also be saved in <a href=\"profile.html#bookings\">your profile</a>."
        : "Tip: <a href=\"login.html\">log in</a> to fill in your details automatically and keep your bookings in your profile.";

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        successBox.classList.add("d-none");
        errorBox.classList.add("d-none");

        if (!validator.validateAll()) {
            playSound("error");
            showToast("Please fix the highlighted fields.", "error");
            return;
        }

        var bookingData = {
            name: document.getElementById("name").value.trim(),
            email: document.getElementById("email").value.trim().toLowerCase(),
            phone: cleanPhone(document.getElementById("phone").value),
            tour: document.getElementById("city").value,
            date: document.getElementById("travelDate").value,
            travelers: Number(document.getElementById("travelers").value.trim()),
            message: document.getElementById("msg").value.trim(),
            newsletter: document.getElementById("newsletter").checked
        };

        // Spinner + "Please wait..." and the button is disabled
        setButtonLoading($(submitButton), true);
        var startedAt = Date.now();

        sendBookingRequest(bookingData, function () {
            afterMinimumDelay(startedAt, function () { onBookingSent(bookingData); });
        }, function (error) {
            afterMinimumDelay(startedAt, function () { onBookingFailed(error); });
        });
    });

    // The "server" answered: save the booking and show the success message
    function onBookingSent(bookingData) {
        var requestId = "TJ-" + String(Date.now()).slice(-6);
        var savedToProfile = false;

        if (getCurrentUser()) {
            updateCurrentUser(function (user) {
                user.bookings = user.bookings || [];
                user.bookings.unshift({
                    id: requestId,
                    tour: bookingData.tour,
                    date: bookingData.date,
                    travelers: bookingData.travelers,
                    createdAt: new Date().toISOString()
                });
            });
            savedToProfile = true;
        }

        form.reset();
        validator.clear();
        fillUserDetails();

        successBox.innerHTML = "Thank you, " + escapeHtml(getFirstName(bookingData.name)) + "! Your request <strong>" + requestId +
            "</strong> for " + escapeHtml(TOUR_LABELS[bookingData.tour]) + " has been sent. We will contact you shortly." +
            (savedToProfile ? ' <a href="profile.html#bookings">See it in your profile</a>.' : "");
        successBox.classList.remove("d-none");
        setButtonLoading($(submitButton), false);
        playSound("success");
        showToast("Booking request " + requestId + " sent!", "success");
    }

    // Something went wrong (for example, no internet)
    function onBookingFailed() {
        errorBox.textContent = "Could not send the request. Please check your connection and try again.";
        errorBox.classList.remove("d-none");
        setButtonLoading($(submitButton), false);
        playSound("error");
        showToast("Could not send the request. Try again.", "error");
    }

    // "Clear" button also removes all error messages
    form.addEventListener("reset", function () {
        successBox.classList.add("d-none");
        errorBox.classList.add("d-none");
        validator.clear();
    });
}


/* =====================================================
   SIGN UP (signup.html)
   Saves a new user (name, email, phone, password) in
   localStorage and sends the user to the Log In page.
   ===================================================== */
function initSignupForm() {
    var form = document.getElementById("signupForm");
    if (!form) return;

    var errorBox = document.getElementById("signupFormError");
    var button = document.getElementById("signupBtn");

    var validator = setupValidation([
        { id: "signupName", check: checkName },
        { id: "signupEmail", check: function (value) {
            var message = checkEmail(value);
            if (message) return message;
            if (findUserByEmail(value)) return "An account with this email already exists. Please log in.";
            return "";
        } },
        { id: "signupPhone", check: checkPhone },
        { id: "signupPassword", check: checkPassword },
        { id: "signupConfirm", check: function (value) {
            return checkConfirmPassword(value, document.getElementById("signupPassword").value);
        } },
        { id: "signupTerms", check: function (checked) {
            return checked ? "" : "Please accept the terms to create an account.";
        } }
    ]);

    initPasswordMeter("signupPassword");

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        errorBox.classList.add("d-none");

        if (!validator.validateAll()) {
            errorBox.textContent = "Please fix the highlighted fields to create your account.";
            errorBox.classList.remove("d-none");
            playSound("error");
            return;
        }

        var email = document.getElementById("signupEmail").value.trim().toLowerCase();
        var users = getUsers();
        users.push({
            name: document.getElementById("signupName").value.trim().replace(/\s+/g, " "),
            email: email,
            phone: cleanPhone(document.getElementById("signupPhone").value),
            password: document.getElementById("signupPassword").value,
            createdAt: new Date().toISOString(),
            favorites: [],
            bookings: []
        });
        saveUsers(users);
        writeStorage(STORAGE_KEYS.lastEmail, email);

        setButtonLoading($(button), true, "Creating account…");
        playSound("success");
        showToast("Account created! Redirecting to Log In…", "success");

        setTimeout(function () {
            window.location.href = "login.html?registered=1";
        }, 1300);
    });
}


/* =====================================================
   LOG IN (login.html)
   Checks the email and password against the saved users.
   On success the email is saved as the current session
   and the user is sent to the Profile page.
   ===================================================== */
function initLoginForm() {
    var form = document.getElementById("loginForm");
    if (!form) return;

    var errorBox = document.getElementById("loginFormError");
    var notice = document.getElementById("loginNotice");
    var button = document.getElementById("loginBtn");
    var emailInput = document.getElementById("loginEmail");
    var passwordInput = document.getElementById("loginPassword");

    var currentUser = getCurrentUser();
    if (new URLSearchParams(window.location.search).get("registered") === "1") {
        notice.textContent = "Your account has been created. Please log in.";
        notice.classList.remove("d-none");
        emailInput.value = readStorage(STORAGE_KEYS.lastEmail, "");
        passwordInput.focus();
    } else if (currentUser) {
        notice.innerHTML = "You are already logged in as <strong>" + escapeHtml(currentUser.name) +
                           "</strong>. <a href=\"profile.html\">Go to your profile</a>.";
        notice.classList.remove("d-none");
    }

    var validator = setupValidation([
        { id: "loginEmail", check: checkEmail },
        { id: "loginPassword", check: function (value) { return value === "" ? "Password is required." : ""; } }
    ]);

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        errorBox.classList.add("d-none");

        if (!validator.validateAll()) {
            playSound("error");
            return;
        }

        var user = findUserByEmail(emailInput.value);

        if (!user) {
            showError(emailInput, "No account found with this email.");
            errorBox.innerHTML = "We could not find this account. <a href=\"signup.html\">Create a free account</a>.";
            errorBox.classList.remove("d-none");
            playSound("error");
            return;
        }
        if (user.password !== passwordInput.value) {
            showError(passwordInput, "Incorrect password. Please try again.");
            passwordInput.focus();
            playSound("error");
            return;
        }

        logIn(user.email);
        setButtonLoading($(button), true, "Logging in…");
        playSound("success");
        showToast("Welcome back, " + getFirstName(user.name) + "!", "success");

        setTimeout(function () {
            window.location.href = "profile.html";
        }, 900);
    });
}


/* =====================================================
   TASK 2: ACCORDION FOR FAQ (about.html)
   Answers are hidden by default. Click on a question
   opens the answer, click again hides it.
   ===================================================== */
function initAccordion() {
    var items = document.querySelectorAll(".faq-item");
    if (items.length === 0) return;

    items.forEach(function (item) {
        var question = item.querySelector(".faq-question");
        var answer = item.querySelector(".faq-answer");

        // Hidden by default
        answer.style.maxHeight = "0px";

        question.addEventListener("click", function () {
            playSound("click");
            var isOpen = item.classList.contains("active");

            if (isOpen) {
                // Hide the answer
                item.classList.remove("active");
                answer.style.maxHeight = "0px";
                question.setAttribute("aria-expanded", "false");
            } else {
                // Show the answer (height = real height of the content)
                item.classList.add("active");
                answer.style.maxHeight = answer.scrollHeight + "px";
                question.setAttribute("aria-expanded", "true");
            }
        });
    });

    // If the window is resized, text can wrap differently,
    // so we recalculate the height of the opened answers
    window.addEventListener("resize", function () {
        items.forEach(function (item) {
            if (item.classList.contains("active")) {
                var answer = item.querySelector(".faq-answer");
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });
}


/* =====================================================
   TASK 3: POPUP SUBSCRIPTION FORM (index.html)
   Hidden by default. Opens with the Subscribe button,
   closes with the X button, click outside, or Esc key.
   ===================================================== */
function initPopup() {
    var popup = document.getElementById("subscribePopup");
    var openButton = document.getElementById("openPopupBtn");
    var closeButton = document.getElementById("closePopupBtn");
    var form = document.getElementById("subscribeForm");
    var message = document.getElementById("subscribeMessage");

    if (!popup || !openButton) return;

    function openPopup() {
        popup.classList.add("show");
        playSound("click");
    }

    function closePopup() {
        popup.classList.remove("show");
    }

    openButton.addEventListener("click", openPopup);
    closeButton.addEventListener("click", closePopup);

    // Click on the dark area outside the white box closes the popup
    popup.addEventListener("click", function (event) {
        if (event.target === popup) {
            closePopup();
        }
    });

    // Esc key closes the popup too
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closePopup();
        }
    });

    // Simple check of the subscription form
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        var nameInput = document.getElementById("subName");
        var emailInput = document.getElementById("subEmail");
        var name = nameInput.value.trim();

        // Same rules as the other forms, errors are shown under each field
        var nameOk = applyCheck(nameInput, checkName(nameInput.value));
        var emailOk = applyCheck(emailInput, checkEmail(emailInput.value));
        if (!nameOk || !emailOk) {
            message.textContent = "Please fix the fields above.";
            message.className = "popup-message popup-error";
            playSound("error");
            return;
        }

        // TASK 6: spinner while the "server" answers, button is disabled
        var $subscribeButton = $(form).find('button[type="submit"]');
        setButtonLoading($subscribeButton, true);
        message.textContent = "";
        message.className = "popup-message";

        setTimeout(function () {
            setButtonLoading($subscribeButton, false);
            playSound("success");
            message.textContent = "Thank you, " + name + "! You are subscribed.";
            message.className = "popup-message popup-success";
            form.reset();
            [nameInput, emailInput].forEach(function (input) { input.classList.remove("input-ok"); });
            showToast("Successfully subscribed, " + name + "!", "success");   // TASK 7

            // Close the popup automatically after a short pause
            setTimeout(function () {
                closePopup();
                message.textContent = "";
                message.className = "popup-message";
            }, 1500);
        }, 1500);
    });
}


/* =====================================================
   TASK 4: CHANGE BACKGROUND COLOR (gallery.html)
   Each click on the button switches to the next color
   from the list (colors match the website theme).
   ===================================================== */
var backgroundColors = [
    { name: "Cloud White", value: "#f4f6f9" },
    { name: "Sakura Pink", value: "#fde8ea" },
    { name: "Sky Blue", value: "#e6f0fa" },
    { name: "Matcha Green", value: "#e8f3ea" },
    { name: "Washi Cream", value: "#f6f0e4" }
];
var currentColorIndex = 0;

function initBackgroundChanger() {
    var button = document.getElementById("changeBgBtn");
    var colorName = document.getElementById("bgColorName");
    if (!button) return;

    button.addEventListener("click", function () {
        // In the night theme the background is controlled by the theme
        if (document.body.classList.contains("dark-theme")) {
            colorName.textContent = "Switch to the Day theme to change the color.";
            playSound("error");
            return;
        }
        playSound("click");

        // Go to the next color, and start again after the last one
        currentColorIndex = (currentColorIndex + 1) % backgroundColors.length;

        var color = backgroundColors[currentColorIndex];
        document.body.style.backgroundColor = color.value;
        colorName.textContent = "Current: " + color.name;
        showToast("Background changed to " + color.name, "info");   // TASK 7
    });
}

/* =====================================================
   TASK 5: CURRENT DATE AND TIME (index.html)
   Uses the Date object, updates every second.
   Example result: October 9, 2026, 10:45:30 AM
   ===================================================== */
function updateDateTime() {
    var box = document.getElementById("datetime");
    if (!box) return;

    var now = new Date();

    var datePart = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
    var timePart = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit"
    });

    box.textContent = datePart + ", " + timePart;
}

function initDateTime() {
    if (!document.getElementById("datetime")) return;

    updateDateTime();
    setInterval(updateDateTime, 1000);
}


/* =====================================================
   ADVANCED JS 1: SOUND EFFECTS (all pages)
   Sounds are made with the Web Audio API, so no audio
   files are needed. Only one sound plays at a time:
   a new sound stops the previous one (no overlapping).
   ===================================================== */

// Object with the settings of every sound
var soundSettings = {
    click:   { frequency: 520, duration: 0.10, wave: "sine" },
    star:    { frequency: 880, duration: 0.18, wave: "triangle" },
    toggle:  { frequency: 330, duration: 0.15, wave: "square" },
    success: { frequency: 660, duration: 0.35, wave: "sine" },
    error:   { frequency: 180, duration: 0.25, wave: "sawtooth" }
};

var audioContext = null;
var currentSound = null;

function playSound(name) {
    var AudioClass = window.AudioContext || window.webkitAudioContext;
    var settings = soundSettings[name];
    if (!AudioClass || !settings) return;

    // The audio context is created only after the first user click
    if (!audioContext) {
        audioContext = new AudioClass();
    }
    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    // Stop the previous sound, so sounds never overlap
    if (currentSound) {
        try { currentSound.stop(); } catch (error) { }
    }

    var oscillator = audioContext.createOscillator();
    var volume = audioContext.createGain();
    var now = audioContext.currentTime;

    oscillator.type = settings.wave;
    oscillator.frequency.value = settings.frequency;

    // Volume goes down smoothly, so there is no harsh click at the end
    volume.gain.setValueAtTime(0.15, now);
    volume.gain.exponentialRampToValueAtTime(0.001, now + settings.duration);

    oscillator.connect(volume);
    volume.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + settings.duration);

    currentSound = oscillator;
    oscillator.onended = function () {
        if (currentSound === oscillator) {
            currentSound = null;
        }
    };
}


/* =====================================================
   LIGHT / DARK MODE SWITCH (all pages)
   Button in the navbar adds or removes the class
   "dark-theme" on <body>. The choice is saved in
   localStorage, so every page opens with the same mode.
   ===================================================== */
function applyTheme(theme) {
    var button = document.getElementById("themeToggle");

    if (theme === "night") {
        document.body.classList.add("dark-theme");
        document.body.style.backgroundColor = "";
        if (button) button.innerHTML = '<span class="theme-icon">☀️</span><span class="theme-label">Light</span>';
    } else {
        document.body.classList.remove("dark-theme");
        // On the gallery page the chosen background color comes back
        if (document.getElementById("changeBgBtn")) {
            document.body.style.backgroundColor = backgroundColors[currentColorIndex].value;
        }
        if (button) button.innerHTML = '<span class="theme-icon">🌙</span><span class="theme-label">Dark</span>';
    }
}

function initThemeSwitch() {
    var button = document.getElementById("themeToggle");
    if (!button) return;

    // Open the page with the theme chosen before
    applyTheme(localStorage.getItem("japanTheme") || "day");

    button.addEventListener("click", function () {
        var isNight = document.body.classList.contains("dark-theme");
        var newTheme = isNight ? "day" : "night";

        applyTheme(newTheme);
        localStorage.setItem("japanTheme", newTheme);
        playSound("toggle");
    });
}


/* =====================================================
   ADVANCED JS 3: KEYBOARD NAVIGATION FOR THE MENU
   Arrow keys move focus between the navbar links.
   Home / End jump to the first / last link.
   ===================================================== */
function initKeyboardNavigation() {
    var links = document.querySelectorAll(".site-navbar .nav-link");
    if (links.length === 0) return;

    links.forEach(function (link, index) {
        link.addEventListener("keydown", function (event) {
            var nextIndex = index;

            // Switch statement: different action for every key
            switch (event.key) {
                case "ArrowRight":
                case "ArrowDown":
                    nextIndex = (index + 1) % links.length;
                    break;
                case "ArrowLeft":
                case "ArrowUp":
                    nextIndex = (index - 1 + links.length) % links.length;
                    break;
                case "Home":
                    nextIndex = 0;
                    break;
                case "End":
                    nextIndex = links.length - 1;
                    break;
                default:
                    return; // other keys work as usual
            }

            event.preventDefault();
            links[nextIndex].focus();
        });
    });
}


/* =====================================================
   ADVANCED JS 4: TIME IN TOKYO BUTTON (index.html)
   Click shows the current time in Japan using
   new Date().toLocaleTimeString()
   ===================================================== */
function initTokyoTime() {
    var button = document.getElementById("tokyoTimeBtn");
    var output = document.getElementById("tokyoTime");
    if (!button || !output) return;

    button.addEventListener("click", function () {
        var tokyoTime = new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Tokyo" });
        output.textContent = "It is " + tokyoTime + " in Tokyo now.";

        // Restart the highlight animation on every click
        output.classList.remove("time-flash");
        void output.offsetWidth;
        output.classList.add("time-flash");

        playSound("click");
    });
}


/* =====================================================
   TOURS DATA, FILTER, SORT, RATING AND FAVOURITES (tours.html)
   - tours: array of objects with methods
   - map / filter / find / forEach: higher-order functions
   - switch: chooses which tours to show
   - stars: click to set the rating
   ===================================================== */

// Array of objects: every tour has data and two methods
var tours = [
    {
        id: 1, city: "tokyo", name: "Tokyo Explorer",
        description: "Modern culture &amp; technology",
        days: 5, nights: 4, price: 1200, rating: 0,
        image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80",
        getDuration: function () { return this.days + " days / " + this.nights + " nights"; },
        getPriceText: function () { return "$" + this.price.toLocaleString("en-US"); }
    },
    {
        id: 2, city: "kyoto", name: "Kyoto Heritage",
        description: "Temples &amp; traditional gardens",
        days: 4, nights: 3, price: 1000, rating: 0,
        image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80",
        getDuration: function () { return this.days + " days / " + this.nights + " nights"; },
        getPriceText: function () { return "$" + this.price.toLocaleString("en-US"); }
    },
    {
        id: 3, city: "osaka", name: "Osaka Food &amp; Lights",
        description: "Street food &amp; entertainment",
        days: 4, nights: 3, price: 900, rating: 0,
        image: "https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=600&q=80",
        getDuration: function () { return this.days + " days / " + this.nights + " nights"; },
        getPriceText: function () { return "$" + this.price.toLocaleString("en-US"); }
    },
    {
        id: 4, city: "fuji", name: "Mount Fuji Nature",
        description: "Lakes, views &amp; adventure",
        days: 3, nights: 2, price: 750, rating: 0,
        image: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=600&q=80",
        getDuration: function () { return this.days + " days / " + this.nights + " nights"; },
        getPriceText: function () { return "$" + this.price.toLocaleString("en-US"); }
    }
];

var ratingWords = ["Poor", "Fair", "Good", "Very good", "Excellent"];

// Ratings given before are loaded from localStorage
var savedRatings = readStorage(STORAGE_KEYS.ratings, {});
tours.forEach(function (tour) {
    tour.rating = savedRatings[tour.id] || 0;
});

// Current filter button and sort order of the tours table
var currentTourFilter = "all";

// Sorts a copy of the list (the original order stays as "Recommended")
function sortTours(list, mode) {
    var sorted = list.slice();
    switch (mode) {
        case "price-asc":
            sorted.sort(function (a, b) { return a.price - b.price; });
            break;
        case "price-desc":
            sorted.sort(function (a, b) { return b.price - a.price; });
            break;
        case "days-asc":
            sorted.sort(function (a, b) { return a.days - b.days; });
            break;
        case "rating-desc":
            sorted.sort(function (a, b) { return b.rating - a.rating; });
            break;
    }
    return sorted;
}

// Heart (save) button and Book link for one tour
function createActionsHtml(tour) {
    var saved = isFavorite(tour.id);
    return '<button type="button" class="fav-btn' + (saved ? " saved" : "") + '" data-tour="' + tour.id +
           '" aria-pressed="' + saved + '" aria-label="Save ' + tour.name + ' to my profile">' + (saved ? "♥" : "♡") + '</button>' +
           '<a class="btn btn-primary btn-sm" href="contact.html?tour=' + tour.city + '">Book</a>';
}

// Builds 5 star buttons for one tour (loop)
function createStarsHtml(tour) {
    var html = "";
    for (var i = 1; i <= 5; i++) {
        var className = i <= tour.rating ? "star selected" : "star";
        html += '<button type="button" class="' + className + '" data-tour="' + tour.id +
                '" data-value="' + i + '" aria-label="Rate ' + i + ' out of 5">★</button>';
    }
    return html;
}

// Shows the given tours in the table
function renderTours(list) {
    var body = document.querySelector("#toursBody");

    // map() turns every tour object into a table row
    var rows = list.map(function (tour) {
        return '<tr class="tour-row">' +
               '<td><strong>' + tour.name + '</strong><br><small>' + tour.description + '</small></td>' +
               '<td data-label="Duration">' + tour.getDuration() + '</td>' +
               '<td class="price-text" data-label="Price">' + tour.getPriceText() + '</td>' +
               '<td class="stars-cell">' + createStarsHtml(tour) + '</td>' +
               '<td class="actions-cell">' + createActionsHtml(tour) + '</td>' +
               '</tr>';
    });

    body.innerHTML = rows.join("");
    initStars();
    initFavoriteButtons();
    applyTourSearch();   // ASSIGNMENT 6, TASK 1: keep the live search working after filter buttons
}

// Switch statement: chooses the tours and the text for each filter button
function showTours(category) {
    var list;
    var info;

    switch (category) {
        case "tokyo":
            list = tours.filter(function (tour) { return tour.city === "tokyo"; });
            info = "Showing: Tokyo tours";
            break;
        case "kyoto":
            list = tours.filter(function (tour) { return tour.city === "kyoto"; });
            info = "Showing: Kyoto tours";
            break;
        case "osaka":
            list = tours.filter(function (tour) { return tour.city === "osaka"; });
            info = "Showing: Osaka tours";
            break;
        case "fuji":
            list = tours.filter(function (tour) { return tour.city === "fuji"; });
            info = "Showing: Mount Fuji tours";
            break;
        default:
            list = tours;
            info = "Showing: all tours";
    }

    // Remember the choice and apply the chosen sort order
    currentTourFilter = category;
    writeStorage(STORAGE_KEYS.tourFilter, category);
    list = sortTours(list, readStorage(STORAGE_KEYS.tourSort, "default"));

    document.getElementById("filterInfo").textContent = info + " (" + list.length + ")";
    renderTours(list);
}

// Click on a star sets the rating of the tour
function initStars() {
    var stars = document.querySelectorAll(".star");
    var message = document.getElementById("ratingMessage");

    stars.forEach(function (star) {
        star.addEventListener("click", function () {
            var tourId = Number(star.dataset.tour);
            var value = Number(star.dataset.value);

            // find() returns the tour object with this id
            var tour = tours.find(function (item) { return item.id === tourId; });
            tour.rating = value;

            // Save the rating, so it is still there after reloading the page
            savedRatings[tourId] = value;
            writeStorage(STORAGE_KEYS.ratings, savedRatings);

            // Color the stars of this tour up to the clicked one
            var tourStars = document.querySelectorAll('.star[data-tour="' + tourId + '"]');
            tourStars.forEach(function (item) {
                item.classList.toggle("selected", Number(item.dataset.value) <= value);
            });

            // Small "pop" animation on the clicked star
            star.classList.add("star-pop");
            star.addEventListener("animationend", function () {
                star.classList.remove("star-pop");
            }, { once: true });

            message.innerHTML = "You rated <strong>" + tour.name + "</strong>: " +
                                value + " / 5 (" + ratingWords[value - 1] + ")";
            playSound("star");
            showToast("You rated " + tour.name.replace("&amp;", "&") + ": " + value + " / 5", "success");   // TASK 7
        });
    });
}

function initTours() {
    if (!document.getElementById("toursBody")) return;

    var buttons = document.querySelectorAll(".filter-btn");
    var sortSelect = document.getElementById("tourSort");

    function markActive(category) {
        buttons.forEach(function (item) {
            item.classList.toggle("active", item.dataset.filter === category);
        });
    }

    buttons.forEach(function (button) {
        button.addEventListener("click", function () {
            markActive(button.dataset.filter);
            showTours(button.dataset.filter);
            playSound("click");
        });
    });

    if (sortSelect) {
        sortSelect.value = readStorage(STORAGE_KEYS.tourSort, "default");
        sortSelect.addEventListener("change", function () {
            writeStorage(STORAGE_KEYS.tourSort, sortSelect.value);
            showTours(currentTourFilter);
        });
    }

    // Open the page with the filter chosen last time
    var savedFilter = readStorage(STORAGE_KEYS.tourFilter, "all");
    markActive(savedFilter);
    showTours(savedFilter);
}


/* =====================================================
   START: run every feature when the page is loaded
   ===================================================== */
initAuthNav();
initPasswordToggles();
initFormValidation();
initSignupForm();
initLoginForm();
initAccordion();
initPopup();
initBackgroundChanger();
initDateTime();
initThemeSwitch();
initKeyboardNavigation();
initTokyoTime();
initTours();


/* =====================================================================
   ASSIGNMENT 6: jQuery
   jQuery is loaded from the CDN in the <head> of every page (Task 0).
   Every feature below first checks that its elements exist on the
   current page, so the same file is safe to use on all pages.
   NOTE: jQuery 4 removed $.trim(), so we use String.trim() instead.
   ===================================================================== */

/* ---------------------------------------------------------------------
   Small helper functions used by several tasks
   --------------------------------------------------------------------- */

// Makes user text safe to put inside HTML (prevents HTML injection)
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Makes user text safe to use inside a regular expression: "a.b" -> "a\.b"
function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


/* =====================================================
   TASK 7: NOTIFICATION SYSTEM (toasts) - all pages
   showToast("text", "success" | "error" | "info")
   A toast fades in, stays 3.5 seconds, then fades out.
   It can also be closed with the x button.
   ===================================================== */
function showToast(message, type) {
    type = type || "success";
    var icons = { success: "✔", error: "✖", info: "ℹ" };

    // The container is created once and reused
    var $container = $("#toastContainer");
    if ($container.length === 0) {
        $container = $('<div id="toastContainer" class="toast-stack" aria-live="polite"></div>').appendTo("body");
    }

    // Keep at most 4 toasts on the screen
    if ($container.children().length >= 4) {
        $container.children().first().remove();
    }

    var $toast = $('<div class="toast-item" role="status"></div>')
        .addClass("toast-" + type)
        .append($('<span class="toast-icon"></span>').text(icons[type]))
        .append($('<span class="toast-text"></span>').text(message))
        .append('<button type="button" class="toast-close" aria-label="Close">&times;</button>')
        .hide()
        .appendTo($container)
        .fadeIn(250);

    function removeToast() {
        $toast.fadeOut(500, function () {
            $(this).remove();
        });
    }

    var timer = setTimeout(removeToast, 3500);

    $toast.find(".toast-close").on("click", function () {
        clearTimeout(timer);
        removeToast();
    });
}


/* =====================================================
   TASK 6: LOADING SPINNER ON SUBMIT - helper
   setButtonLoading($button, true)  -> spinner + "Please wait...", disabled
   setButtonLoading($button, false) -> button is normal again
   Used by the booking form (contact.html) and the
   subscribe form (index.html popup).
   ===================================================== */
function setButtonLoading($button, isLoading, loadingText) {
    if (isLoading) {
        // Remember the original content only once
        if ($button.data("originalHtml") === undefined) {
            $button.data("originalHtml", $button.html());
        }
        $button
            .prop("disabled", true)          // blocks repeated clicks
            .addClass("is-loading")
            .html('<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' +
                  (loadingText || "Please wait…"));
    } else {
        $button
            .prop("disabled", false)
            .removeClass("is-loading")
            .html($button.data("originalHtml"));
        $button.removeData("originalHtml");
    }
}

// Keeps the loading state for at least 1.5 seconds (simulated server call)
function afterMinimumDelay(startedAt, callback) {
    var wait = Math.max(0, 1500 - (Date.now() - startedAt));
    setTimeout(callback, wait);
}


/* =====================================================
   TASK 1: REAL-TIME SEARCH AND LIVE FILTER (tours.html)
   The list of tours is filtered while the user types.
   It also works together with the filter buttons,
   because applyTourSearch() runs after every re-render.
   ===================================================== */
function applyTourSearch() {
    var $input = $("#tourSearch");
    if ($input.length === 0) return;

    // Commas are removed from both sides, so "1000" finds the price "$1,000"
    var query = $input.val().trim().toLowerCase().replace(/,/g, "");
    var $rows = $("#toursBody .tour-row");
    var shown = 0;

    $rows.each(function () {
        var text = $(this).text().toLowerCase().replace(/,/g, "");
        var isMatch = text.indexOf(query) !== -1;
        $(this).toggle(isMatch);
        if (isMatch) shown++;
    });

    $("#noTours").toggle($rows.length > 0 && shown === 0);
    $("#tourSearchInfo").text(query === ""
        ? "Type to filter the tours table."
        : "Found " + shown + " of " + $rows.length + " tours for “" + $input.val().trim() + "”");
    $("#clearTourSearch").toggle(query !== "");
}

function initTourSearch() {
    var $input = $("#tourSearch");
    if ($input.length === 0) return;

    // keyup = after every key, input = also paste and mouse actions.
    // The text is saved in localStorage and comes back after reload.
    $input.on("keyup input", function () {
        writeStorage(STORAGE_KEYS.tourSearch, $input.val());
        applyTourSearch();
    });

    $("#clearTourSearch").on("click", function () {
        $input.val("").trigger("focus");
        writeStorage(STORAGE_KEYS.tourSearch, "");
        applyTourSearch();
    });

    // Link from the home page autocomplete (tours.html?q=Tokyo) wins over the saved text
    var fromUrl = new URLSearchParams(window.location.search).get("q");
    if (fromUrl) {
        $input.val(fromUrl);
        writeStorage(STORAGE_KEYS.tourSearch, fromUrl);
    } else {
        $input.val(readStorage(STORAGE_KEYS.tourSearch, ""));
    }
    applyTourSearch();
}


/* =====================================================
   TASK 2: AUTOCOMPLETE SEARCH SUGGESTIONS (index.html)
   A dropdown with suggestions appears while the user types.
   Arrow keys + Enter, mouse click and Esc are supported.
   ===================================================== */
var searchSuggestions = [
    { label: "Tokyo Explorer",        type: "Tour",  url: "tours.html?q=Tokyo" },
    { label: "Kyoto Heritage",        type: "Tour",  url: "tours.html?q=Kyoto" },
    { label: "Osaka Food & Lights",   type: "Tour",  url: "tours.html?q=Osaka" },
    { label: "Mount Fuji Nature",     type: "Tour",  url: "tours.html?q=Fuji" },
    { label: "Tokyo Tower",           type: "Photo", url: "gallery.html" },
    { label: "Shinjuku Lights",       type: "Photo", url: "gallery.html" },
    { label: "Kiyomizu-dera Temple",  type: "Photo", url: "gallery.html" },
    { label: "Fushimi Inari Shrine",  type: "Photo", url: "gallery.html" },
    { label: "Arashiyama Bamboo",     type: "Photo", url: "gallery.html" },
    { label: "Osaka Castle",          type: "Photo", url: "gallery.html" },
    { label: "Chureito Pagoda",       type: "Photo", url: "gallery.html" },
    { label: "Sakura Season in Nara", type: "Photo", url: "gallery.html" },
    { label: "Do I need a visa?",     type: "FAQ",   url: "about.html#faq" },
    { label: "Best time to visit Japan", type: "FAQ", url: "about.html#faq" },
    { label: "What is included in the tour price?", type: "FAQ", url: "about.html#faq" },
    { label: "Book your trip",        type: "Page",  url: "contact.html" }
];

function initAutocomplete() {
    var $input = $("#destInput");
    var $list = $("#suggestList");
    if ($input.length === 0) return;

    var selectedUrl = "";   // address chosen from the dropdown
    var activeIndex = -1;   // which suggestion is selected with the arrow keys

    function closeList() {
        $list.empty().hide();
        activeIndex = -1;
        $input.attr("aria-expanded", "false");
    }

    function showSuggestions() {
        var query = $input.val().trim();
        selectedUrl = "";
        activeIndex = -1;

        if (query === "") {
            closeList();
            return;
        }

        var lower = query.toLowerCase();

        // filter(): keep suggestions that contain the typed text
        var matches = searchSuggestions.filter(function (item) {
            return item.label.toLowerCase().indexOf(lower) !== -1;
        });

        // Suggestions that START with the text go first
        matches.sort(function (a, b) {
            var aStarts = a.label.toLowerCase().indexOf(lower) === 0 ? 0 : 1;
            var bStarts = b.label.toLowerCase().indexOf(lower) === 0 ? 0 : 1;
            return aStarts - bStarts;
        });

        $list.empty();

        if (matches.length === 0) {
            $list.append('<li class="suggest-empty">No suggestions found</li>');
        }

        matches.slice(0, 6).forEach(function (item) {
            var start = item.label.toLowerCase().indexOf(lower);
            var $li = $('<li class="suggest-item" role="option"></li>')
                .data("item", item)
                .append($("<span class=\"suggest-text\"></span>")
                    .append(document.createTextNode(item.label.slice(0, start)))
                    .append($("<strong></strong>").text(item.label.slice(start, start + query.length)))
                    .append(document.createTextNode(item.label.slice(start + query.length))))
                .append($('<span class="suggest-type"></span>').text(item.type));
            $list.append($li);
        });

        $list.show();
        $input.attr("aria-expanded", "true");
    }

    function chooseSuggestion($li) {
        var item = $li.data("item");
        if (!item) return;
        $input.val(item.label);
        selectedUrl = item.url;
        closeList();
        $input.trigger("focus");
    }

    function moveActive(step) {
        var $items = $list.children(".suggest-item");
        if ($items.length === 0) return;
        activeIndex = (activeIndex + step + $items.length) % $items.length;
        $items.removeClass("active").eq(activeIndex).addClass("active");
    }

    $input.on("input", showSuggestions);

    $input.on("keydown", function (event) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            moveActive(1);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveActive(-1);
        } else if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            chooseSuggestion($list.children(".suggest-item").eq(activeIndex));
        } else if (event.key === "Escape") {
            closeList();
        }
    });

    // Click on a suggestion (mousedown works before the input loses focus)
    $list.on("mousedown", ".suggest-item", function (event) {
        event.preventDefault();
        chooseSuggestion($(this));
    });

    $list.on("mouseenter", ".suggest-item", function () {
        $list.children().removeClass("active");
        $(this).addClass("active");
        activeIndex = $(this).index();
    });

    // Click outside closes the dropdown
    $(document).on("click", function (event) {
        if ($(event.target).closest("#destSearch").length === 0) {
            closeList();
        }
    });

    // Search button / Enter: go to the chosen page
    $("#destForm").on("submit", function (event) {
        event.preventDefault();
        var text = $input.val().trim();

        if (text === "") {
            showToast("Please type a destination first.", "error");
            return;
        }
        var target = selectedUrl || "tours.html?q=" + encodeURIComponent(text);
        showToast("Opening “" + text + "”…", "info");
        setTimeout(function () {
            window.location.href = target;
        }, 600);
    });
}


/* =====================================================
   TASK 3: SEARCH HIGHLIGHTING (about.html, FAQ)
   All words that match the search text are wrapped in
   <mark>. Answers with matches open automatically.
   Uses .html(), a regular expression and .toggle().
   ===================================================== */
function highlightText(original, regex) {
    // split() with a capturing group keeps the matches at odd positions
    var parts = original.split(regex);
    return parts.map(function (part, index) {
        return index % 2 === 1
            ? '<mark class="hl">' + escapeHtml(part) + "</mark>"
            : escapeHtml(part);
    }).join("");
}

function initFaqSearch() {
    var $input = $("#faqSearch");
    if ($input.length === 0) return;

    var textSelector = ".faq-question span:first-child, .faq-answer p";

    // Remember the original text, so we can restore it later
    $(textSelector).each(function () {
        $(this).data("original", $(this).text());
    });

    function runSearch() {
        var query = $input.val().trim();
        var regex = query === "" ? null : new RegExp("(" + escapeRegExp(query) + ")", "gi");
        var totalMatches = 0;
        var itemsWithMatches = 0;

        $(".faq-item").each(function () {
            var $item = $(this);
            var $answer = $item.find(".faq-answer");
            var itemMatches = 0;

            $item.find(textSelector).each(function () {
                var $element = $(this);
                var original = $element.data("original");

                if (regex) {
                    var found = original.match(regex);
                    if (found) itemMatches += found.length;
                    $element.html(highlightText(original, regex));
                } else {
                    $element.text(original);   // restore the clean text
                }
            });

            totalMatches += itemMatches;
            if (itemMatches > 0) itemsWithMatches++;

            if (!regex) {
                // Empty search: show everything, close all answers
                $item.show().removeClass("active");
                $answer.css("maxHeight", "0px");
                $item.find(".faq-question").attr("aria-expanded", "false");
            } else if (itemMatches > 0) {
                // Matching question: show it and open the answer
                $item.show().addClass("active");
                $answer.css("maxHeight", $answer[0].scrollHeight + "px");
                $item.find(".faq-question").attr("aria-expanded", "true");
            } else {
                $item.hide();
            }
        });

        if (!regex) {
            $("#faqSearchInfo").text("Type a word to highlight it in the questions and answers.");
        } else if (totalMatches === 0) {
            $("#faqSearchInfo").text("No results for “" + query + "”.");
        } else {
            $("#faqSearchInfo").text(totalMatches + " match" + (totalMatches === 1 ? "" : "es") +
                                     " in " + itemsWithMatches + " question" + (itemsWithMatches === 1 ? "" : "s") + ".");
        }
    }

    $input.on("keyup input", runSearch);
}


/* =====================================================
   TASK 4: COLORFUL SCROLL PROGRESS BAR - all pages
   A rainbow bar at the top of the window fills while the
   user scrolls. A sakura flower rides on the end of the
   bar and a round badge in the corner shows the percent.
   ===================================================== */
function initScrollProgress() {
    var $bar = $(
        '<div id="scrollProgress" aria-hidden="true">' +
            '<div class="sp-fill"></div>' +
            '<span class="sp-flower">🌸</span>' +
        '</div>' +
        '<div id="scrollPercent" aria-hidden="true">0%</div>'
    ).appendTo("body");

    var $fill = $("#scrollProgress .sp-fill");
    var $flower = $("#scrollProgress .sp-flower");
    var $percent = $("#scrollPercent");

    function updateProgress() {
        var scrollable = $(document).height() - $(window).height();
        var scrolled = $(window).scrollTop();
        var percent = scrollable > 0 ? (scrolled / scrollable) * 100 : 0;
        percent = Math.min(100, Math.max(0, percent));

        $fill.css("width", percent + "%");
        // The flower moves with the bar and turns while scrolling
        $flower.css({
            left: "max(14px, min(" + percent + "%, calc(100% - 14px)))",
            transform: "translate(-50%, -50%) rotate(" + (percent * 7) + "deg)"
        });
        $percent.text(Math.round(percent) + "%").toggleClass("done", percent >= 99.5);
        $("#scrollProgress").toggleClass("done", percent >= 99.5);
    }

    $(window).on("scroll resize", updateProgress);
    updateProgress();
}


/* =====================================================
   TASK 5: ANIMATED NUMBER COUNTER (index.html)
   Numbers count from 0 to data-target when the stats
   section comes into view. Uses jQuery .animate().
   data-decimals and data-suffix are optional.
   ===================================================== */
function initCounters() {
    var $numbers = $(".stat-number");
    var $section = $("#stats");
    if ($numbers.length === 0 || $section.length === 0) return;

    var started = false;

    function formatNumber(value, decimals) {
        return value.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    function startCounting() {
        $numbers.each(function () {
            var $element = $(this);
            var target = parseFloat($element.attr("data-target"));
            var decimals = parseInt($element.attr("data-decimals"), 10) || 0;
            var suffix = $element.attr("data-suffix") || "";

            // A plain object is animated, and the text is updated on every step
            $({ value: 0 }).animate({ value: target }, {
                duration: 2200,
                easing: "swing",
                step: function (currentValue) {
                    $element.text(formatNumber(currentValue, decimals) + suffix);
                },
                complete: function () {
                    $element.text(formatNumber(target, decimals) + suffix);
                }
            });
        });
    }

    // Start only once, when the section is visible in the window
    function checkVisible() {
        if (started) return;
        var windowBottom = $(window).scrollTop() + $(window).height();
        if (windowBottom > $section.offset().top + 80) {
            started = true;
            startCounting();
        }
    }

    $(window).on("scroll resize", checkVisible);
    checkVisible();
}


/* =====================================================
   TASK 8: COPIED TO CLIPBOARD BUTTON
   (tours.html promo code, contact.html phone and email)
   Click: text is copied, the icon becomes a checkmark and
   a tooltip "Copied to clipboard!" appears. After 2
   seconds everything goes back to normal.
   ===================================================== */
var ICON_COPY = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
var ICON_CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';

// Copies text. Modern way first, old way (copy event) as a backup.
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
        var $helper = $('<textarea readonly class="copy-helper"></textarea>').val(text).appendTo("body");
        $helper[0].select();

        // The "copy" event: we put our own text into the clipboard
        $(document).one("copy", function (event) {
            event.originalEvent.clipboardData.setData("text/plain", text);
            event.preventDefault();
        });

        var success = false;
        try { success = document.execCommand("copy"); } catch (error) { }
        $helper.remove();

        if (success) { resolve(); } else { reject(); }
    });
}

function initCopyButtons() {
    var $buttons = $(".copy-btn");
    if ($buttons.length === 0) return;

    $buttons.find(".copy-icon").html(ICON_COPY);

    $buttons.on("click", function () {
        var $button = $(this);
        var $icon = $button.find(".copy-icon");
        var $tip = $button.find(".copy-tip");
        var text = $($button.attr("data-copy-target")).text().trim();

        copyToClipboard(text).then(function () {
            $icon.html(ICON_CHECK);
            $button.addClass("copied");
            $tip.stop(true, true).fadeIn(150);
            showToast("Copied: " + text, "success");
            playSound("success");

            // Back to normal after 2 seconds
            clearTimeout($button.data("timer"));
            $button.data("timer", setTimeout(function () {
                $icon.html(ICON_COPY);
                $button.removeClass("copied");
                $tip.fadeOut(200);
            }, 2000));
        }).catch(function () {
            showToast("Could not copy. Please copy the text manually.", "error");
            playSound("error");
        });
    });
}


/* =====================================================
   TASK 9: IMAGE LAZY LOADING (gallery.html, index.html)
   Images have a light placeholder in src and the real
   address in data-src. When an image comes close to the
   visible part of the window, its src is replaced.
   Uses scroll(), .offset() and .attr("src").
   ===================================================== */
function initLazyLoading() {
    var $images = $("img.lazy");
    if ($images.length === 0) return;

    // The counter shows only the gallery images; carousel slides load by their own events
    var loadedCount = 0;
    $("#lazyTotal").text($images.not(".carousel-item img").length);
    $("#lazyCount").text(0);

    function loadImage($img) {
        if ($img.data("lazyStarted")) return;
        $img.data("lazyStarted", true);

        $img.one("load error", function () {
            $img.removeClass("lazy").addClass("lazy-loaded");
            if ($img.closest(".carousel-item").length === 0) {
                loadedCount++;
                $("#lazyCount").text(loadedCount);
            }
        });
        $img.attr("src", $img.attr("data-src"));   // the main trick of lazy loading
    }

    // Is the image inside the window (plus 150px before it)?
    function isNearViewport($img) {
        if (!$img.is(":visible")) return false;    // hidden carousel slides wait for their turn
        var imageTop = $img.offset().top;
        var imageBottom = imageTop + $img.height();
        var viewTop = $(window).scrollTop();
        var viewBottom = viewTop + $(window).height();
        return imageBottom >= viewTop - 150 && imageTop <= viewBottom + 150;
    }

    function checkImages() {
        $("img.lazy").each(function () {
            var $img = $(this);
            if (isNearViewport($img)) {
                loadImage($img);
            }
        });
    }

    // Wait for one frame so scrolling stays smooth
    var waiting = false;
    $(window).on("scroll resize", function () {
        if (waiting) return;
        waiting = true;
        requestAnimationFrame(function () {
            waiting = false;
            checkImages();
        });
    });

    // Carousel: load the next slide (and the one after it) before it is shown
    var carousel = document.getElementById("japanCarousel");
    if (carousel) {
        carousel.addEventListener("slide.bs.carousel", function (event) {
            var $next = $(event.relatedTarget);
            loadImage($next.find("img.lazy"));
            loadImage($next.next().find("img.lazy"));
        });
    }

    checkImages();
}


/* =====================================================================
   FINAL PROJECT FEATURES
   ===================================================================== */

/* =====================================================
   FAVOURITE TOURS (tours.html -> profile.html)
   The ids of saved tours are kept in the user object.
   ===================================================== */
function isFavorite(tourId) {
    var user = getCurrentUser();
    return !!user && (user.favorites || []).indexOf(tourId) !== -1;
}

// Adds or removes a tour. Returns true (added), false (removed) or null (not logged in).
function toggleFavorite(tourId) {
    var added = null;
    updateCurrentUser(function (user) {
        user.favorites = user.favorites || [];
        var index = user.favorites.indexOf(tourId);
        if (index === -1) {
            user.favorites.push(tourId);
            added = true;
        } else {
            user.favorites.splice(index, 1);
            added = false;
        }
    });
    return added;
}

// The ♡ buttons in the tours table (created again after every render)
function initFavoriteButtons() {
    document.querySelectorAll(".fav-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            var tourId = Number(button.dataset.tour);
            var tour = tours.find(function (item) { return item.id === tourId; });
            var tourName = tour.name.replace("&amp;", "&");

            if (!getCurrentUser()) {
                playSound("error");
                showToast("Please log in to save tours to your profile.", "info");
                return;
            }

            var added = toggleFavorite(tourId);
            button.classList.toggle("saved", added);
            button.textContent = added ? "♥" : "♡";
            button.setAttribute("aria-pressed", String(added));
            button.classList.remove("pop");
            void button.offsetWidth;            // restart the animation
            button.classList.add("pop");

            playSound(added ? "star" : "click");
            showToast(added ? tourName + " saved to your profile." : tourName + " removed from saved tours.", added ? "success" : "info");
        });
    });
}


/* =====================================================
   PROFILE PAGE (profile.html)
   Shows the stored user details, saved tours and
   bookings. Also: edit profile, log out, delete account.
   ===================================================== */
function renderProfile() {
    var user = getCurrentUser();
    if (!user) return;

    var favorites = user.favorites || [];
    var bookings = user.bookings || [];
    var ratingCount = Object.keys(readStorage(STORAGE_KEYS.ratings, {})).length;

    $("#profileAvatar").text(getInitials(user.name));
    $("#profileName").text(user.name);
    $("#profileSince").text("Member since " + formatDate(user.createdAt));
    $("#detailName").text(user.name);
    $("#detailEmail").text(user.email);
    $("#detailPhone").text(formatPhone(user.phone));
    $("#detailSince").text(formatDate(user.createdAt));
    $("#statSaved").text(favorites.length);
    $("#statBookings").text(bookings.length);
    $("#statRatings").text(ratingCount);

    // Saved tours as cards
    var savedHtml = favorites.map(function (tourId) {
        var tour = tours.find(function (item) { return item.id === tourId; });
        if (!tour) return "";
        return '<div class="col-12 col-md-6 col-xl-4">' +
                 '<div class="card theme-card saved-card h-100">' +
                   '<img src="' + tour.image + '" class="card-img-top" alt="' + tour.name + '">' +
                   '<div class="card-body">' +
                     '<h3 class="card-title mb-0">' + tour.name + '</h3>' +
                     '<p class="saved-meta">' + tour.getDuration() + ' · <span class="price-text">' + tour.getPriceText() + '</span></p>' +
                     '<div class="d-flex gap-2 mt-auto">' +
                       '<a href="contact.html?tour=' + tour.city + '" class="btn btn-primary btn-sm">Book</a>' +
                       '<button type="button" class="btn btn-outline-primary btn-sm remove-fav" data-tour="' + tour.id + '">Remove</button>' +
                     '</div>' +
                   '</div>' +
                 '</div>' +
               '</div>';
    }).join("");
    $("#savedTours").html(savedHtml);
    $("#savedEmpty").toggleClass("d-none", favorites.length > 0);

    // Bookings as a list
    var bookingsHtml = bookings.map(function (booking) {
        return '<article class="booking-item">' +
                 '<div>' +
                   '<h3>' + escapeHtml(TOUR_LABELS[booking.tour] || booking.tour) + '</h3>' +
                   '<p>Request ' + escapeHtml(booking.id) + ' · Travel date: ' + formatDate(booking.date + "T00:00:00") +
                   ' · ' + booking.travelers + (booking.travelers === 1 ? " traveller" : " travellers") + '</p>' +
                   '<p>Sent on ' + formatDate(booking.createdAt) + ' <span class="booking-status">Pending confirmation</span></p>' +
                 '</div>' +
                 '<button type="button" class="btn btn-outline-danger btn-sm cancel-booking" data-booking="' + escapeHtml(booking.id) + '">Cancel</button>' +
               '</article>';
    }).join("");
    $("#bookingList").html(bookingsHtml);
    $("#bookingsEmpty").toggleClass("d-none", bookings.length > 0);
}

function initProfilePage() {
    var content = document.getElementById("profileContent");
    if (!content) return;

    var user = getCurrentUser();
    if (!user) {
        $("#profileGuest").removeClass("d-none");
        return;
    }
    $(content).removeClass("d-none");
    renderProfile();

    // Edit profile form (same validation rules as Sign Up)
    var $form = $("#editProfileForm");
    $("#editName").val(user.name);
    $("#editPhone").val(formatPhoneLocal(user.phone));

    var validator = setupValidation([
        { id: "editName", check: checkName },
        { id: "editPhone", check: checkPhone }
    ]);

    $form.on("submit", function (event) {
        event.preventDefault();
        if (!validator.validateAll()) {
            playSound("error");
            return;
        }
        updateCurrentUser(function (current) {
            current.name = $("#editName").val().trim().replace(/\s+/g, " ");
            current.phone = cleanPhone($("#editPhone").val());
        });
        renderProfile();
        initAuthNav();
        playSound("success");
        showToast("Your profile has been updated.", "success");
    });

    // Remove a saved tour / cancel a booking (event delegation, the buttons are created by JS)
    $("#savedTours").on("click", ".remove-fav", function () {
        toggleFavorite(Number($(this).data("tour")));
        renderProfile();
        playSound("click");
        showToast("Tour removed from saved tours.", "info");
    });

    $("#bookingList").on("click", ".cancel-booking", function () {
        var bookingId = String($(this).data("booking"));
        updateCurrentUser(function (current) {
            current.bookings = (current.bookings || []).filter(function (booking) { return booking.id !== bookingId; });
        });
        renderProfile();
        playSound("click");
        showToast("Booking " + bookingId + " cancelled.", "info");
    });

    $("#logoutBtn").on("click", function () {
        logOut();
        playSound("toggle");
        showToast("You have been logged out. See you soon!", "info");
        setTimeout(function () { window.location.href = "login.html"; }, 800);
    });

    // Delete account: the first click asks for confirmation on the button itself
    var $deleteButton = $("#deleteAccountBtn");
    var confirmTimer = null;
    $deleteButton.on("click", function () {
        if (!$deleteButton.hasClass("confirming")) {
            $deleteButton.addClass("confirming").text("Click again to confirm");
            playSound("error");
            confirmTimer = setTimeout(function () {
                $deleteButton.removeClass("confirming").text("Delete Account");
            }, 4000);
            return;
        }
        clearTimeout(confirmTimer);
        var email = getCurrentUser().email;
        saveUsers(getUsers().filter(function (item) { return item.email !== email; }));
        logOut();
        showToast("Your account has been deleted.", "info");
        setTimeout(function () { window.location.href = "signup.html"; }, 900);
    });
}


/* =====================================================
   GALLERY FILTER AND SEARCH (gallery.html)
   Category buttons + search text work together.
   Both choices are saved in localStorage.
   ===================================================== */
function initGalleryFilter() {
    var $cards = $(".gallery-card[data-category]");
    if ($cards.length === 0) return;

    var $buttons = $(".gallery-filter");
    var $input = $("#gallerySearch");
    var category = readStorage(STORAGE_KEYS.galleryFilter, "all");
    $input.val(readStorage(STORAGE_KEYS.gallerySearch, ""));

    function applyFilter() {
        var query = $input.val().trim().toLowerCase();
        var shown = 0;

        $cards.each(function () {
            var $card = $(this);
            var text = ($card.find(".gallery-overlay").text() + " " + $card.find("img").attr("alt")).toLowerCase();
            var isMatch = (category === "all" || $card.data("category") === category) && text.indexOf(query) !== -1;
            $card.toggle(isMatch);
            if (isMatch) shown++;
        });

        $buttons.removeClass("active").filter('[data-category="' + category + '"]').addClass("active");
        $("#galleryEmpty").toggle(shown === 0);
        $("#gallerySearchInfo").text("Showing " + shown + " of " + $cards.length + " photos");
        $("#clearGallerySearch").toggle(query !== "");
        $(window).trigger("scroll");   // lets lazy loading load the photos that became visible
    }

    $buttons.on("click", function () {
        category = $(this).data("category");
        writeStorage(STORAGE_KEYS.galleryFilter, category);
        playSound("click");
        applyFilter();
    });

    $input.on("input", function () {
        writeStorage(STORAGE_KEYS.gallerySearch, $input.val());
        applyFilter();
    });

    $("#clearGallerySearch").on("click", function () {
        $input.val("").trigger("focus");
        writeStorage(STORAGE_KEYS.gallerySearch, "");
        applyFilter();
    });

    applyFilter();
}


/* =====================================================
   EXTERNAL APIs (guide.html)
   1. Open-Meteo        - live weather for 4 places
   2. ExchangeRate-API  - yen exchange rates
   3. Nager.Date        - upcoming public holidays in Japan
   All requests use fetch() + async/await, show a loading
   state, and show an error message with "Try again".
   ===================================================== */

// fetch() with a 10 second time limit; throws an error if the answer is not OK
async function fetchJson(url) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 10000);
    try {
        var response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

// Shows "loading" or "error" in a status box. Error boxes get a "Try again" button.
function showApiStatus(box, type, message, retry) {
    if (type === "loading") {
        box.innerHTML = '<div class="api-loading"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span>' +
                        escapeHtml(message) + '</div>';
    } else if (type === "error") {
        box.innerHTML = '<div class="api-error"><span>⚠ ' + escapeHtml(message) + '</span>' +
                        '<button type="button" class="btn btn-sm btn-outline-primary retry-btn">Try again</button></div>';
        box.querySelector(".retry-btn").addEventListener("click", retry);
    } else {
        box.innerHTML = "";
    }
}

/* ---------- 1. Weather ---------- */
var WEATHER_CITIES = [
    { id: "tokyo", name: "Tokyo",          lat: 35.6762, lon: 139.6503 },
    { id: "kyoto", name: "Kyoto",          lat: 35.0116, lon: 135.7681 },
    { id: "osaka", name: "Osaka",          lat: 34.6937, lon: 135.5023 },
    { id: "fuji",  name: "Mt. Fuji area",  lat: 35.4975, lon: 138.7556 }
];

// WMO weather codes used by Open-Meteo -> [icon, text]
var WEATHER_CODES = {
    0: ["☀️", "Clear sky"], 1: ["🌤️", "Mainly clear"], 2: ["⛅", "Partly cloudy"], 3: ["☁️", "Overcast"],
    45: ["🌫️", "Fog"], 48: ["🌫️", "Freezing fog"],
    51: ["🌦️", "Light drizzle"], 53: ["🌦️", "Drizzle"], 55: ["🌧️", "Heavy drizzle"],
    56: ["🌧️", "Freezing drizzle"], 57: ["🌧️", "Freezing drizzle"],
    61: ["🌧️", "Light rain"], 63: ["🌧️", "Rain"], 65: ["🌧️", "Heavy rain"],
    66: ["🌧️", "Freezing rain"], 67: ["🌧️", "Freezing rain"],
    71: ["🌨️", "Light snow"], 73: ["🌨️", "Snow"], 75: ["❄️", "Heavy snow"], 77: ["🌨️", "Snow grains"],
    80: ["🌦️", "Rain showers"], 81: ["🌧️", "Rain showers"], 82: ["⛈️", "Heavy showers"],
    85: ["🌨️", "Snow showers"], 86: ["❄️", "Snow showers"],
    95: ["⛈️", "Thunderstorm"], 96: ["⛈️", "Thunderstorm, hail"], 99: ["⛈️", "Thunderstorm, hail"]
};

function describeWeather(code) {
    return WEATHER_CODES[code] || ["🌡️", "Unknown"];
}

function buildWeatherCard(city, place) {
    var now = place.current;
    var weather = describeWeather(now.weather_code);

    // Next 3 days (index 0 is today)
    var forecast = "";
    for (var i = 1; i <= 3 && i < place.daily.time.length; i++) {
        var day = new Date(place.daily.time[i] + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
        forecast += '<li><span>' + day + '</span><span>' + describeWeather(place.daily.weather_code[i])[0] + '</span>' +
                    '<span>' + Math.round(place.daily.temperature_2m_max[i]) + '° / ' + Math.round(place.daily.temperature_2m_min[i]) + '°</span></li>';
    }

    return '<article class="weather-card" data-city="' + city.id + '">' +
             '<div class="weather-top">' +
               '<div><h3>' + city.name + '</h3><p class="weather-desc">' + weather[1] + '</p></div>' +
               '<span class="weather-icon" aria-hidden="true">' + weather[0] + '</span>' +
             '</div>' +
             '<p class="weather-temp">' + Math.round(now.temperature_2m) + '°C</p>' +
             '<p class="weather-meta">Feels like ' + Math.round(now.apparent_temperature) + '°C · 💧 ' +
               now.relative_humidity_2m + '% · 💨 ' + Math.round(now.wind_speed_10m) + ' km/h</p>' +
             '<ul class="forecast">' + forecast + '</ul>' +
           '</article>';
}

function applyWeatherFilter() {
    var city = readStorage(STORAGE_KEYS.weatherCity, "all");
    $("#weatherFilter .chip").removeClass("active").filter('[data-city="' + city + '"]').addClass("active");
    $("#weatherGrid .weather-card").each(function () {
        $(this).toggle(city === "all" || $(this).data("city") === city);
    });
}

async function loadWeather() {
    var grid = document.getElementById("weatherGrid");
    var status = document.getElementById("weatherStatus");
    var button = document.getElementById("refreshWeather");

    showApiStatus(status, "loading", "Loading live weather…");
    button.disabled = true;
    button.classList.add("spinning");

    // Grey "skeleton" cards while waiting
    grid.innerHTML = WEATHER_CITIES.map(function (city) {
        return '<div class="weather-card skeleton" data-city="' + city.id + '">' +
               '<div class="skeleton-line short"></div><div class="skeleton-line big"></div>' +
               '<div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>';
    }).join("");
    applyWeatherFilter();

    var url = "https://api.open-meteo.com/v1/forecast" +
        "?latitude=" + WEATHER_CITIES.map(function (c) { return c.lat; }).join(",") +
        "&longitude=" + WEATHER_CITIES.map(function (c) { return c.lon; }).join(",") +
        "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
        "&timezone=Asia%2FTokyo&forecast_days=4";

    try {
        var data = await fetchJson(url);
        var places = Array.isArray(data) ? data : [data];   // many places -> array

        grid.innerHTML = places.map(function (place, index) {
            return buildWeatherCard(WEATHER_CITIES[index], place);
        }).join("");
        status.innerHTML = '<p class="api-updated">Updated ' + new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) +
                           ' · Japan time now: ' + new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Tokyo", hour: "numeric", minute: "2-digit" }) + '</p>';
        applyWeatherFilter();
    } catch (error) {
        grid.innerHTML = "";
        showApiStatus(status, "error", "Could not load the weather. Please check your internet connection.", loadWeather);
    } finally {
        button.disabled = false;
        button.classList.remove("spinning");
    }
}

/* ---------- 2. Currency converter ---------- */
var CURRENCY_SYMBOLS = { KZT: "₸", USD: "$", EUR: "€", RUB: "₽" };
var yenRates = null;   // how much of each currency 1 yen costs, e.g. { KZT: 3.3, USD: 0.0066 }

function checkAmount(value) {
    var text = value.trim().replace(/\s/g, "").replace(",", ".");
    if (text === "") return "Please enter an amount.";
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return "Enter a positive number, e.g. 50000 or 99.50.";
    var amount = Number(text);
    if (amount <= 0) return "Amount must be greater than zero.";
    if (amount > 100000000) return "Amount is too large (100,000,000 maximum).";
    return "";
}

function showConversion() {
    var amount = Number($("#currencyAmount").val().trim().replace(/\s/g, "").replace(",", "."));
    var from = $("#currencyFrom").val();
    var yen = amount / yenRates[from];

    $("#convertResult").html(
        '<span class="convert-from">' + amount.toLocaleString("en-US") + " " + CURRENCY_SYMBOLS[from] + " " + from + ' =</span>' +
        '<span class="convert-to">¥ ' + Math.round(yen).toLocaleString("en-US") + '</span>'
    );
}

async function loadRates() {
    var status = document.getElementById("currencyStatus");
    showApiStatus(status, "loading", "Loading exchange rates…");

    try {
        var data = await fetchJson("https://open.er-api.com/v6/latest/JPY");
        if (data.result !== "success") throw new Error("API error");

        yenRates = data.rates;
        status.innerHTML = "";

        $("#rateList").html(Object.keys(CURRENCY_SYMBOLS).map(function (code) {
            return '<li>1 ' + code + ' = <strong>¥ ' + (1 / yenRates[code]).toFixed(2) + '</strong></li>';
        }).join(""));
        $("#rateUpdated").text("Rates updated: " + new Date(data.time_last_update_unix * 1000).toLocaleString("en-US", {
            month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
        }));

        // Show the result again for the saved amount
        if ($("#currencyAmount").val().trim() !== "" && checkAmount($("#currencyAmount").val()) === "") {
            showConversion();
        }
    } catch (error) {
        showApiStatus(status, "error", "Could not load exchange rates.", loadRates);
    }
}

function initCurrencyForm() {
    var $form = $("#currencyForm");
    var saved = readStorage(STORAGE_KEYS.currency, { from: "KZT", amount: "" });
    $("#currencyFrom").val(saved.from);
    $("#currencyAmount").val(saved.amount);

    var validator = setupValidation([{ id: "currencyAmount", check: checkAmount }]);

    function saveChoice() {
        writeStorage(STORAGE_KEYS.currency, { from: $("#currencyFrom").val(), amount: $("#currencyAmount").val().trim() });
    }

    $form.on("submit", function (event) {
        event.preventDefault();
        if (!validator.validateAll()) {
            playSound("error");
            return;
        }
        if (!yenRates) {
            showToast("Exchange rates are not loaded yet. Please try again.", "error");
            return;
        }
        saveChoice();
        showConversion();
        playSound("click");
    });

    $("#currencyFrom").on("change", function () {
        saveChoice();
        if (yenRates && checkAmount($("#currencyAmount").val()) === "") showConversion();
    });
}

/* ---------- 3. Upcoming public holidays in Japan ---------- */
async function loadHolidays() {
    var status = document.getElementById("holidayStatus");
    var list = document.getElementById("holidayList");
    showApiStatus(status, "loading", "Loading Japanese holidays…");

    try {
        var holidays = await fetchJson("https://date.nager.at/api/v3/NextPublicHolidays/JP");
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        status.innerHTML = "";
        list.innerHTML = holidays.slice(0, 6).map(function (holiday) {
            var date = new Date(holiday.date + "T00:00:00");
            var daysLeft = Math.round((date - today) / 86400000);
            var when = daysLeft === 0 ? "Today" : (daysLeft === 1 ? "Tomorrow" : "In " + daysLeft + " days");

            return '<li class="holiday-item">' +
                     '<div class="holiday-date"><span>' + date.toLocaleDateString("en-US", { month: "short" }) + '</span>' +
                       '<strong>' + date.getDate() + '</strong></div>' +
                     '<div class="holiday-text"><h4>' + escapeHtml(holiday.name) + '</h4>' +
                       '<p lang="ja">' + escapeHtml(holiday.localName) + '</p></div>' +
                     '<span class="holiday-badge">' + when + '</span>' +
                   '</li>';
        }).join("");
    } catch (error) {
        list.innerHTML = "";
        showApiStatus(status, "error", "Could not load the holiday calendar.", loadHolidays);
    }
}

function initGuidePage() {
    if (!document.getElementById("weatherGrid")) return;

    $("#refreshWeather").on("click", function () {
        playSound("click");
        loadWeather();
    });

    $("#weatherFilter .chip").on("click", function () {
        writeStorage(STORAGE_KEYS.weatherCity, $(this).data("city"));
        playSound("click");
        applyWeatherFilter();
    });

    initCurrencyForm();
    loadWeather();
    loadRates();
    loadHolidays();
}


/* =====================================================
   TASK 0: SETUP + START OF ALL jQuery FEATURES
   ===================================================== */
$(document).ready(function () {
    initTourSearch();       // Task 1
    initAutocomplete();     // Task 2
    initFaqSearch();        // Task 3
    initScrollProgress();   // Task 4
    initCounters();         // Task 5
    initCopyButtons();      // Task 8
    initGalleryFilter();    // gallery.html: category filter + search
    initLazyLoading();      // Task 9
    initProfilePage();      // profile.html
    initGuidePage();        // guide.html: external APIs
    // Task 6 (spinner) and Task 7 (toasts) are used inside the forms and buttons above
});
