// AUTO-GENERATED from content.yaml. Do not edit directly — edit content.yaml and run `pnpm run build`.
// Theme toggle
(function () {
  const btn = document.getElementById("themeToggle");
  function updateIcon() {
    btn.textContent =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "☀️"
        : "🌙";
  }
  updateIcon();
  btn.addEventListener("click", function () {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    updateIcon();
  });
})();

// ── Config embedded at build time ───────────────────────────────
const TIME_SLOTS = [{"day_offset":0,"label":"Afternoon (2pm – 5pm)"},{"day_offset":0,"label":"Evening (5pm – 7pm)"},{"day_offset":1,"label":"Morning (8am – 11am)"}];
const BAKE_DAY = "Tuesday";
const WEEKS_AHEAD = 8;
const MIN_LEAD_TIME_DAYS = 2;
const FORMSPREE_ID = "xeerqnnq";
const SPECIAL_EVENT = {
  title: "Mother's Day Treat Boxes",
  pickupLabel: "Mother's Day Boxes",
  icon: "🌸",
  deadline: "2026-05-05",
  pickupDays: [{"date":"2026-05-08","label":"Friday, May 8"},{"date":"2026-05-09","label":"Saturday, May 9"}],
};

// ── Quantity tracking ───────────────────────────────────────────
// qty[key] = { count, price, label } — keys match each +1 button's data-key
const qty = {};
let specialItems = [];

document.querySelectorAll('[data-key][data-delta="1"]').forEach((btn) => {
  qty[btn.dataset.key] = {
    count: 0,
    price: Number(btn.dataset.price),
    label: btn.dataset.label,
  };
});

const pickupSelect = document.getElementById("pickup");
const timeSelect = document.getElementById("pickupTime");
const submitBtn = document.getElementById("submitBtn");
const summaryLines = document.getElementById("summary-lines");

// ── Pickup options ──────────────────────────────────────────────
const WEEKDAY_INDEX = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};
const MAX_DAY_OFFSET = TIME_SLOTS.reduce(
  (max, s) => Math.max(max, s.day_offset),
  0,
);

function toISO(d) {
  return d.toISOString().split("T")[0];
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getUpcomingBakeDays(count) {
  const bakeIdx = WEEKDAY_INDEX[BAKE_DAY];
  const result = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() + MIN_LEAD_TIME_DAYS);
  let d = new Date(today);
  while (d.getDay() !== bakeIdx) d.setDate(d.getDate() + 1);
  while (result.length < count) {
    if (d >= cutoff) result.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return result;
}

function daysForBakeWeek(bakeDate) {
  const out = [];
  for (let offset = 0; offset <= MAX_DAY_OFFSET; offset++) {
    const d = new Date(bakeDate);
    d.setDate(bakeDate.getDate() + offset);
    out.push({ date: toISO(d), label: formatDate(d) });
  }
  return out;
}

(function populatePickupOptions() {
  if (SPECIAL_EVENT) {
    const deadline = new Date(SPECIAL_EVENT.deadline + "T23:59:59");
    if (new Date() <= deadline) {
      const opt = document.createElement("option");
      const abbrev = SPECIAL_EVENT.pickupDays
        .map((d) => {
          const dt = new Date(d.date + "T12:00:00Z");
          const wk = dt.toLocaleDateString("en-US", {
            weekday: "short",
            timeZone: "UTC",
          });
          const mo = dt.toLocaleDateString("en-US", {
            month: "short",
            timeZone: "UTC",
          });
          return wk + " " + mo + " " + dt.getUTCDate();
        })
        .join(" or ");
      opt.value = "special";
      opt.textContent =
        SPECIAL_EVENT.icon +
        " " +
        SPECIAL_EVENT.pickupLabel +
        " … Pickup " +
        abbrev;
      opt.dataset.days = JSON.stringify(SPECIAL_EVENT.pickupDays);
      opt.dataset.special = "true";
      pickupSelect.appendChild(opt);
    }
  }

  getUpcomingBakeDays(WEEKS_AHEAD).forEach((bakeDate) => {
    const opt = document.createElement("option");
    opt.value = toISO(bakeDate);
    opt.textContent = "Week of " + formatDate(bakeDate);
    opt.dataset.days = JSON.stringify(daysForBakeWeek(bakeDate));
    pickupSelect.appendChild(opt);
  });
})();

function updateTimeOptions() {
  const sel = pickupSelect.options[pickupSelect.selectedIndex];
  timeSelect.innerHTML = "";
  if (!sel || !sel.value) {
    timeSelect.innerHTML =
      '<option value="">-- Select pickup week first --</option>';
    return;
  }
  const days = JSON.parse(sel.dataset.days || "[]");
  TIME_SLOTS.forEach((slot, idx) => {
    if (slot.day_offset >= days.length) return;
    const day = days[slot.day_offset];
    const opt = document.createElement("option");
    opt.value = day.date + "|slot" + idx;
    opt.textContent = day.label + " — " + slot.label;
    timeSelect.appendChild(opt);
  });
  validatePickup();
  validatePickupTime();
  checkValidity();
}

pickupSelect.addEventListener("change", updateTimeOptions);

// ── Basket summary ──────────────────────────────────────────────
function updateSummary() {
  let html = "";
  let total = 0;
  const rmStyle =
    "background:none;border:none;color:var(--ember);cursor:pointer;font-size:0.75rem;margin-left:6px;font-family:inherit;";

  Object.entries(qty).forEach(([key, item]) => {
    if (item.count > 0) {
      const sub = item.count * item.price;
      total += sub;
      html +=
        '<div class="summary-line"><span>' +
        item.label +
        " × " +
        item.count +
        ' <button type="button" class="remove-qty" data-remove-key="' +
        key +
        '" style="' +
        rmStyle +
        '">✕ remove</button>' +
        "</span><span>$" +
        sub +
        "</span></div>";
    }
  });

  specialItems.forEach((item, i) => {
    total += item.price;
    html +=
      '<div class="summary-line"><span>' +
      item.label +
      ' <button type="button" class="remove-special" data-index="' +
      i +
      '" style="' +
      rmStyle +
      '">✕ remove</button></span><span>$' +
      item.price +
      "</span></div>";
  });

  if (!html) {
    summaryLines.innerHTML =
      '<div class="summary-empty">No items selected yet — add something above!</div>';
  } else {
    html +=
      '<div class="summary-line" style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(250,243,228,0.2);font-weight:700;color:var(--wheat);"><span>Estimated Total</span><span>$' +
      total +
      "</span></div>";
    summaryLines.innerHTML = html;
  }

  const itemCount =
    Object.values(qty).filter((v) => v.count > 0).length + specialItems.length;
  const bar = document.getElementById("mobileBar");
  if (bar) {
    bar.classList.toggle("has-items", itemCount > 0);
    document.getElementById("mobileBarBadge").textContent = itemCount;
    document.getElementById("mobileBarTotal").textContent = "$" + total;
  }
}

summaryLines.addEventListener("click", function (e) {
  const btn = e.target.closest(".remove-special, .remove-qty");
  if (!btn) return;

  if (btn.classList.contains("remove-special")) {
    const idx = parseInt(btn.dataset.index, 10);
    specialItems.splice(idx, 1);
  } else if (btn.dataset.removeKey) {
    const key = btn.dataset.removeKey;
    if (qty[key]) {
      qty[key].count = 0;
      const disp = document.getElementById(key + "-display");
      if (disp) disp.textContent = "0";
    }
  }

  updateSummary();
  checkValidity();
});

document.querySelectorAll("[data-key]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.key;
    if (!qty[key]) return;
    qty[key].count = Math.max(
      0,
      qty[key].count + parseInt(btn.dataset.delta, 10),
    );
    const disp = document.getElementById(key + "-display");
    if (disp) disp.textContent = qty[key].count;
    updateSummary();
    checkValidity();
  });
});

document.querySelectorAll("[data-add-special]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const prefix = SPECIAL_EVENT ? SPECIAL_EVENT.title : "Special";
    specialItems.push({
      label: prefix + ": " + btn.dataset.name,
      price: parseInt(btn.dataset.price, 10),
    });
    updateSummary();
    checkValidity();
  });
});

// ── Validation ──────────────────────────────────────────────────
function getNameError(val, label) {
  if (!val.trim()) return label + " is required";
  const clean = val.trim();
  if (
    !/^[A-Za-z\s'\-]+$/.test(clean) ||
    clean.replace(/[^A-Za-z]/g, "").length < 2
  )
    return "Must be at least 2 letters";
  return "";
}

function getEmailError(val) {
  if (!val.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()))
    return "Please enter a valid email address";
  return "";
}

function getPhoneError(val) {
  if (!val.trim()) return "Phone number is required";
  if (val.replace(/\D/g, "").length < 10) return "Must be at least 10 digits";
  return "";
}

function getPickupError(val) {
  return val ? "" : "Please select a pickup week";
}
function getPickupTimeError(val) {
  return val ? "" : "Please select a pickup time";
}

function setFieldError(inputId, msg) {
  const input = document.getElementById(inputId);
  const errEl = document.getElementById(inputId + "-error");
  if (!input || !errEl) return;
  errEl.textContent = msg;
  if (msg) input.classList.add("invalid");
  else input.classList.remove("invalid");
}

function validateFname() {
  const e = getNameError(document.getElementById("fname").value, "First name");
  setFieldError("fname", e);
  return !e;
}
function validateLname() {
  const e = getNameError(document.getElementById("lname").value, "Last name");
  setFieldError("lname", e);
  return !e;
}
function validateEmail() {
  const e = getEmailError(document.getElementById("email").value);
  setFieldError("email", e);
  return !e;
}
function validatePhone() {
  const e = getPhoneError(document.getElementById("phone").value);
  setFieldError("phone", e);
  return !e;
}
function validatePickup() {
  const e = getPickupError(pickupSelect.value);
  setFieldError("pickup", e);
  return !e;
}
function validatePickupTime() {
  const e = getPickupTimeError(timeSelect.value);
  setFieldError("pickupTime", e);
  return !e;
}

function hasItems() {
  return (
    Object.values(qty).some((v) => v.count > 0) || specialItems.length > 0
  );
}

function checkValidity() {
  const ok =
    !getNameError(document.getElementById("fname").value, "First name") &&
    !getNameError(document.getElementById("lname").value, "Last name") &&
    !getEmailError(document.getElementById("email").value) &&
    !getPhoneError(document.getElementById("phone").value) &&
    pickupSelect.value &&
    timeSelect.value &&
    hasItems() &&
    document.getElementById("payAgree").checked;
  submitBtn.disabled = !ok;
}

document.getElementById("fname").addEventListener("input", () => {
  validateFname();
  checkValidity();
});
document.getElementById("lname").addEventListener("input", () => {
  validateLname();
  checkValidity();
});
document.getElementById("email").addEventListener("input", () => {
  validateEmail();
  checkValidity();
});
document.getElementById("phone").addEventListener("input", () => {
  validatePhone();
  checkValidity();
});
pickupSelect.addEventListener("change", () => {
  validatePickup();
  checkValidity();
});
timeSelect.addEventListener("change", () => {
  validatePickupTime();
  checkValidity();
});
document
  .getElementById("payAgree")
  .addEventListener("change", checkValidity);

document.getElementById("orderForm").addEventListener("submit", handleSubmit);

async function handleSubmit(e) {
  e.preventDefault();

  if (!document.getElementById("payAgree").checked) {
    const row = document.getElementById("checkboxRow");
    row.classList.add("shake");
    setTimeout(() => row.classList.remove("shake"), 800);
    return;
  }

  const fname = document.getElementById("fname").value.trim();
  const lname = document.getElementById("lname").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const notes = document.getElementById("notes").value.trim();

  const pickupEl = document.getElementById("pickup");
  const pickupText =
    pickupEl.options[pickupEl.selectedIndex]?.text || "Not selected";
  const timeEl = document.getElementById("pickupTime");
  const timeText =
    timeEl.options[timeEl.selectedIndex]?.text || "Not selected";

  const orderLines = [];
  let total = 0;

  Object.values(qty).forEach((item) => {
    if (item.count > 0) {
      const sub = item.count * item.price;
      total += sub;
      orderLines.push(item.label + " x" + item.count + " — $" + sub);
    }
  });

  specialItems.forEach((item) => {
    total += item.price;
    orderLines.push(item.label + " — $" + item.price);
  });

  const fd = new FormData();
  fd.append(
    "_subject",
    "🏕️ New Basecamp Bakery Order — " +
      fname +
      " " +
      lname,
  );
  fd.append("name", fname + " " + lname);
  fd.append("email", email);
  fd.append("phone", phone);
  fd.append("pickup_week", pickupText);
  fd.append("pickup_time", timeText);
  fd.append(
    "order_summary",
    orderLines.join("\n") + "\n\nEstimated Total: $" + total,
  );
  fd.append("notes", notes || "None");

  submitBtn.textContent = "⏳ Sending...";
  submitBtn.disabled = true;

  try {
    const res = await fetch("https://formspree.io/f/" + FORMSPREE_ID, {
      method: "POST",
      body: fd,
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const confSummary = document.getElementById("confirmationSummary");
      let confHTML = "<h3>Your Order</h3>";
      orderLines.forEach(function (line) {
        confHTML += '<div class="conf-line">' + line + "</div>";
      });
      confHTML +=
        '<div class="conf-total">Estimated Total: $' + total + "</div>";
      confSummary.innerHTML = confHTML;

      document.getElementById("orderForm").style.display = "none";
      document.getElementById("successScreen").classList.add("show");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      submitBtn.innerHTML = "🔥 Submit My Order";
      submitBtn.disabled = false;
      alert(
        "Something went wrong submitting your order. Please try again or contact us directly.",
      );
    }
  } catch {
    submitBtn.innerHTML = "🔥 Submit My Order";
    submitBtn.disabled = false;
    alert(
      "Network error — please check your connection and try again.",
    );
  }
}
