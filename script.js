let breadQty = 0;
let easterItems = [];

const sizedQty = {
  cinroll_4: 0,
  cinroll_12: 0,
  cookies_6: 0,
  cookies_12: 0,
  dinner_6: 0,
  dinner_12: 0,
};

const sizedMeta = {
  cinroll_4: { label: "Cinnamon Rolls (4 rolls)", price: 14 },
  cinroll_12: { label: "Cinnamon Rolls (1 dozen)", price: 38 },
  cookies_6: { label: "Choc Chip Cookies (\u00bd dozen)", price: 10 },
  cookies_12: { label: "Choc Chip Cookies (1 dozen)", price: 18 },
  dinner_6: { label: "Dinner Rolls (\u00bd dozen)", price: 10 },
  dinner_12: { label: "Dinner Rolls (1 dozen)", price: 18 },
};

const pickupSelect = document.getElementById("pickup");
const timeSelect = document.getElementById("pickupTime");
const submitBtn = document.getElementById("submitBtn");
const summaryLines = document.getElementById("summary-lines");

function getUpcomingTuesdays(count) {
  const tuesdays = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() + 2);
  let d = new Date(today);
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
  while (tuesdays.length < count) {
    if (d >= cutoff) tuesdays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return tuesdays;
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function toISO(d) {
  return d.toISOString().split("T")[0];
}

(function populatePickupOptions() {
  const easterDeadline = new Date("2026-03-24T23:59:59");
  if (new Date() <= easterDeadline) {
    const opt = document.createElement("option");
    opt.value = "2026-04-01";
    opt.textContent = "\uD83D\uDC23 Easter Box Pickup \u2026 Wednesday April 1st";
    opt.dataset.tue = "2026-04-01";
    opt.dataset.wed = "2026-04-02";
    opt.dataset.tueLabel = "Wednesday, April 1";
    opt.dataset.wedLabel = "Thursday, April 2";
    opt.dataset.easter = "true";
    pickupSelect.appendChild(opt);
  }

  getUpcomingTuesdays(8).forEach((tue) => {
    const wed = new Date(tue);
    wed.setDate(tue.getDate() + 1);
    const opt = document.createElement("option");
    opt.value = toISO(tue);
    opt.textContent = "Week of " + formatDate(tue);
    opt.dataset.tue = toISO(tue);
    opt.dataset.wed = toISO(wed);
    opt.dataset.tueLabel = formatDate(tue);
    opt.dataset.wedLabel = formatDate(wed);
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
  const tueLabel = sel.dataset.tueLabel;
  const wedLabel = sel.dataset.wedLabel;
  [
    {
      value: sel.dataset.tue + "|afternoon",
      text: "Tuesday " + tueLabel + " \u2014 Afternoon (2pm \u2013 5pm)",
    },
    {
      value: sel.dataset.tue + "|evening",
      text: "Tuesday " + tueLabel + " \u2014 Evening (5pm \u2013 7pm)",
    },
    {
      value: sel.dataset.wed + "|morning",
      text: "Wednesday " + wedLabel + " \u2014 Morning (8am \u2013 11am)",
    },
  ].forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.text;
    timeSelect.appendChild(opt);
  });
  validatePickup();
  validatePickupTime();
  checkValidity();
}

pickupSelect.addEventListener("change", updateTimeOptions);

function updateSummary() {
  let html = "";
  let total = 0;

  if (breadQty > 0) {
    const sub = breadQty * 10;
    total += sub;
    html +=
      '<div class="summary-line"><span>Sandwich Bread \u00d7 ' +
      breadQty +
      "</span><span>$" +
      sub +
      "</span></div>";
  }

  Object.entries(sizedQty).forEach(([key, qty]) => {
    if (qty > 0) {
      const meta = sizedMeta[key];
      const sub = qty * meta.price;
      total += sub;
      html +=
        '<div class="summary-line"><span>' +
        meta.label +
        " \u00d7 " +
        qty +
        "</span><span>$" +
        sub +
        "</span></div>";
    }
  });

  easterItems.forEach((item, i) => {
    total += item.price;
    html +=
      '<div class="summary-line"><span>' +
      item.label +
      ' <button type="button" class="remove-easter" data-index="' +
      i +
      '" style="background:none;border:none;color:var(--ember);cursor:pointer;font-size:0.75rem;margin-left:6px;font-family:inherit;">\u2715 remove</button></span><span>$' +
      item.price +
      "</span></div>";
  });

  if (!html) {
    summaryLines.innerHTML =
      '<div class="summary-empty">No items selected yet \u2014 add something above!</div>';
  } else {
    html +=
      '<div class="summary-line" style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(250,243,228,0.2);font-weight:700;color:var(--wheat);"><span>Estimated Total</span><span>$' +
      total +
      "</span></div>";
    summaryLines.innerHTML = html;
  }

  const itemCount =
    (breadQty > 0 ? 1 : 0) +
    Object.values(sizedQty).filter((v) => v > 0).length +
    easterItems.length;
  const bar = document.getElementById("mobileBar");
  if (bar) {
    bar.classList.toggle("has-items", itemCount > 0);
    document.getElementById("mobileBarBadge").textContent = itemCount;
    document.getElementById("mobileBarTotal").textContent = "$" + total;
  }
}

summaryLines.addEventListener("click", function (e) {
  const btn = e.target.closest(".remove-easter");
  if (!btn) return;
  const idx = parseInt(btn.dataset.index, 10);
  easterItems.splice(idx, 1);
  updateSummary();
  checkValidity();
});

document.querySelectorAll("[data-qty]").forEach((btn) => {
  btn.addEventListener("click", () => {
    breadQty = Math.max(0, breadQty + parseInt(btn.dataset.delta, 10));
    document.getElementById("bread-display").textContent = breadQty;
    updateSummary();
    checkValidity();
  });
});

document.querySelectorAll("[data-sized]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.sized;
    sizedQty[key] = Math.max(
      0,
      sizedQty[key] + parseInt(btn.dataset.delta, 10),
    );
    document.getElementById(key + "-display").textContent = sizedQty[key];
    updateSummary();
    checkValidity();
  });
});

document.querySelectorAll("[data-add-easter]").forEach((btn) => {
  btn.addEventListener("click", () => {
    easterItems.push({
      label: "Easter Box: " + btn.dataset.name,
      price: parseInt(btn.dataset.price, 10),
    });
    updateSummary();
    checkValidity();
  });
});

document.getElementById("clearOrderBtn").addEventListener("click", () => {
  breadQty = 0;
  easterItems = [];
  Object.keys(sizedQty).forEach((k) => {
    sizedQty[k] = 0;
  });
  document.getElementById("bread-display").textContent = "0";
  Object.keys(sizedQty).forEach((k) => {
    document.getElementById(k + "-display").textContent = "0";
  });
  updateSummary();
  checkValidity();
});

function getNameError(val, label) {
  if (!val.trim()) return label + " is required";
  const clean = val.trim();
  if (
    !/^[A-Za-z\s'\-]+$/.test(clean) ||
    clean.replace(/[^A-Za-z]/g, "").length < 2
  ) {
    return "Must be at least 2 letters";
  }
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
  if (msg) {
    input.classList.add("invalid");
  } else {
    input.classList.remove("invalid");
  }
}

function validateFname() {
  const err = getNameError(
    document.getElementById("fname").value,
    "First name",
  );
  setFieldError("fname", err);
  return !err;
}

function validateLname() {
  const err = getNameError(document.getElementById("lname").value, "Last name");
  setFieldError("lname", err);
  return !err;
}

function validateEmail() {
  const err = getEmailError(document.getElementById("email").value);
  setFieldError("email", err);
  return !err;
}

function validatePhone() {
  const err = getPhoneError(document.getElementById("phone").value);
  setFieldError("phone", err);
  return !err;
}

function validatePickup() {
  const err = getPickupError(pickupSelect.value);
  setFieldError("pickup", err);
  return !err;
}

function validatePickupTime() {
  const err = getPickupTimeError(timeSelect.value);
  setFieldError("pickupTime", err);
  return !err;
}

function hasItems() {
  return (
    breadQty > 0 ||
    Object.values(sizedQty).some((v) => v > 0) ||
    easterItems.length > 0
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
document.getElementById("payAgree").addEventListener("change", checkValidity);

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
  const timeText = timeEl.options[timeEl.selectedIndex]?.text || "Not selected";

  const orderLines = [];
  let total = 0;

  if (breadQty > 0) {
    const sub = breadQty * 10;
    total += sub;
    orderLines.push("Sandwich Bread x" + breadQty + " \u2014 $" + sub);
  }

  Object.entries(sizedQty).forEach(([key, qty]) => {
    if (qty > 0) {
      const meta = sizedMeta[key];
      const sub = qty * meta.price;
      total += sub;
      orderLines.push(meta.label + " x" + qty + " \u2014 $" + sub);
    }
  });

  easterItems.forEach((item) => {
    total += item.price;
    orderLines.push(item.label + " \u2014 $" + item.price);
  });

  const fd = new FormData();
  fd.append(
    "_subject",
    "\uD83C\uDFD5\uFE0F New Basecamp Bakery Order \u2014 " +
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

  submitBtn.textContent = "\u23F3 Sending...";
  submitBtn.disabled = true;

  try {
    const res = await fetch("https://formspree.io/f/xeerqnnq", {
      method: "POST",
      body: fd,
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      document.getElementById("orderForm").style.display = "none";
      document.getElementById("successScreen").classList.add("show");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      submitBtn.innerHTML = "\uD83D\uDD25 Submit My Order";
      submitBtn.disabled = false;
      alert(
        "Something went wrong submitting your order. Please try again or contact us directly.",
      );
    }
  } catch {
    submitBtn.innerHTML = "\uD83D\uDD25 Submit My Order";
    submitBtn.disabled = false;
    alert("Network error \u2014 please check your connection and try again.");
  }
}
