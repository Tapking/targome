"use strict";

const $ = (selector) =>
  document.querySelector(selector);


/* =========================
   STATE
========================= */

const state = {
  history: loadJSON(
    "translator_history",
    []
  ),

  favorites: loadJSON(
    "translator_favorites",
    []
  ),

  translating: false
};


/* =========================
   STORAGE
========================= */

function loadJSON(key, fallback) {
  try {
    const value =
      JSON.parse(
        localStorage.getItem(key)
      );

    return value ?? fallback;

  } catch {
    return fallback;
  }
}


function saveJSON(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch (error) {
    console.error(
      "Storage error:",
      error
    );
  }
}


/* =========================
   STATUS
========================= */

function setStatus(
  message = "",
  error = false
) {
  const element =
    $("#status");

  element.textContent =
    message;

  element.className =
    "status" +
    (error ? " error" : "");
}


/* =========================
   RESULT
========================= */

function getResult() {
  const element =
    $("#resultText");

  if (
    element.classList.contains(
      "placeholder"
    )
  ) {
    return "";
  }

  return element.textContent.trim();
}


function setResult(text) {
  const element =
    $("#resultText");

  if (text) {

    element.textContent =
      text;

    element.classList.remove(
      "placeholder"
    );

  } else {

    element.textContent =
      "ترجمه اینجا نمایش داده می‌شود.";

    element.classList.add(
      "placeholder"
    );
  }

  updateCounts();
}


/* =========================
   COUNTERS
========================= */

function updateCounts() {

  const source =
    $("#sourceText").value;

  const result =
    getResult();

  $("#sourceCount").textContent =
    `${source.length} / 5000`;

  $("#targetCount").textContent =
    result.length;
}


/* =========================
   LANGUAGE
========================= */

function detectLanguage(text) {

  if (!text.trim()) {
    return "fa";
  }

  const persian =
    /[\u0600-\u06FF]/;

  return persian.test(text)
    ? "fa"
    : "en";
}


function normalizeLanguages() {

  const source =
    $("#sourceLang").value;

  const target =
    $("#targetLang").value;

  if (
    source !== "auto" &&
    source === target
  ) {

    $("#targetLang").value =
      source === "fa"
        ? "en"
        : "fa";
  }
}


/* =========================
   SWAP
========================= */

function swapLanguages() {

  let source =
    $("#sourceLang").value;

  let target =
    $("#targetLang").value;


  if (source === "auto") {

    source =
      detectLanguage(
        $("#sourceText").value
      );
  }


  if (target === source) {

    target =
      source === "fa"
        ? "en"
        : "fa";
  }


  $("#sourceLang").value =
    target;

  $("#targetLang").value =
    source;


  const sourceText =
    $("#sourceText").value;

  const result =
    getResult();


  if (result) {

    $("#sourceText").value =
      result;

    setResult(
      sourceText
    );
  }


  setStatus("");

  updateCounts();
}


/* =========================
   TRANSLATION
========================= */

async function translate() {

  if (
    state.translating
  ) {
    return;
  }


  normalizeLanguages();


  const text =
    $("#sourceText")
      .value
      .trim();


  if (!text) {

    setStatus(
      "اول متن را وارد کن.",
      true
    );

    $("#sourceText").focus();

    return;
  }


  let source =
    $("#sourceLang").value;

  const target =
    $("#targetLang").value;


  if (source === "auto") {

    source =
      detectLanguage(text);

    $("#sourceLang").value =
      source;
  }


  if (
    source === target
  ) {

    setStatus(
      "زبان ورودی و خروجی باید متفاوت باشند.",
      true
    );

    return;
  }


  state.translating =
    true;


  const button =
    $("#translateBtn");


  button.disabled =
    true;

  button.textContent =
    "⏳ در حال ترجمه...";


  setStatus(
    "در حال دریافت ترجمه..."
  );


  try {

    const url =
      "https://api.mymemory.translated.net/get" +
      `?q=${encodeURIComponent(text)}` +
      `&langpair=${source}|${target}`;


    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json"
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP_${response.status}`
      );
    }


    const data =
      await response.json();


    const translated =
      String(
        data?.responseData
          ?.translatedText || ""
      ).trim();


    if (!translated) {

      throw new Error(
        "EMPTY_TRANSLATION"
      );
    }


    if (
      data?.responseStatus &&
      Number(
        data.responseStatus
      ) !== 200
    ) {

      throw new Error(
        data.responseDetails ||
        "TRANSLATION_ERROR"
      );
    }


    setResult(
      translated
    );


    addHistory({
      source,
      target,
      text,
      translated,
      at: Date.now()
    });


    setStatus(
      "ترجمه با موفقیت انجام شد. ✓"
    );


  } catch (error) {

    console.error(
      "Translation error:",
      error
    );


    setStatus(
      "ترجمه انجام نشد. اینترنت و سرویس ترجمه را بررسی کن.",
      true
    );


  } finally {

    state.translating =
      false;


    button.disabled =
      false;


    button.textContent =
      "🌐 ترجمه کن";
  }
}


/* =========================
   HISTORY
========================= */

function addHistory(item) {

  state.history = [
    item,

    ...state.history.filter(
      (old) =>
        !(
          old.text === item.text &&
          old.source === item.source &&
          old.target === item.target
        )
    )
  ].slice(0, 50);


  saveJSON(
    "translator_history",
    state.history
  );


  renderHistory();
}


function renderHistory() {

  const list =
    $("#historyList");

  const empty =
    $("#emptyHistory");

  const search =
    $("#historySearch")
      .value
      .trim()
      .toLowerCase();


  list.innerHTML = "";


  const items =
    state.history.filter(
      (item) => {

        if (!search) {
          return true;
        }

        return (
          item.text
            .toLowerCase()
            .includes(search) ||

          item.translated
            .toLowerCase()
            .includes(search)
        );
      }
    );


  empty.style.display =
    items.length
      ? "none"
      : "block";


  items.forEach(
    (item) => {

      const row =
        document.createElement(
          "article"
        );


      row.className =
        "history-item";


      row.innerHTML = `
        <div class="history-top">

          <span>
            ${
              item.source === "fa"
                ? "🇮🇷 فارسی"
                : "🇬🇧 English"
            }

            →

            ${
              item.target === "fa"
                ? "🇮🇷 فارسی"
                : "🇬🇧 English"
            }
          </span>

          <span>
            ${new Date(
              item.at
            ).toLocaleString(
              "fa-IR"
            )}
          </span>

        </div>

        <div class="history-source"></div>

        <div class="history-target"></div>
      `;


      row.querySelector(
        ".history-source"
      ).textContent =
        item.text;


      row.querySelector(
        ".history-target"
      ).textContent =
        item.translated;


      row.addEventListener(
        "click",
        () => {

          $("#sourceLang").value =
            item.source;

          $("#targetLang").value =
            item.target;

          $("#sourceText").value =
            item.text;

          setResult(
            item.translated
          );

          setStatus(
            "ترجمه از تاریخچه بارگذاری شد."
          );

          updateCounts();


          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        }
      );


      list.appendChild(row);
    }
  );
}


/* =========================
   COPY
========================= */

async function copyResult() {

  const text =
    getResult();


  if (!text) {

    setStatus(
      "هنوز ترجمه‌ای وجود ندارد.",
      true
    );

    return;
  }


  try {

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {

      await navigator.clipboard
        .writeText(text);

    } else {

      const area =
        document.createElement(
          "textarea"
        );

      area.value =
        text;

      area.style.position =
        "fixed";

      area.style.opacity =
        "0";

      document.body.appendChild(
        area
      );

      area.focus();
      area.select();

      document.execCommand(
        "copy"
      );

      area.remove();
    }


    setStatus(
      "ترجمه کپی شد. ✓"
    );

  } catch (error) {

    console.error(
      "Copy error:",
      error
    );

    setStatus(
      "کپی انجام نشد.",
      true
    );
  }
}


/* =========================
   PASTE
========================= */

async function pasteText() {

  try {

    if (
      navigator.clipboard &&
      navigator.clipboard.readText
    ) {

      const text =
        await navigator.clipboard
          .readText();

      $("#sourceText").value =
        text.slice(0, 5000);

      updateCounts();

      setStatus(
        "متن از کلیپ‌بورد وارد شد. ✓"
      );

      return;
    }


    setStatus(
      "مرورگر اجازه دسترسی به کلیپ‌بورد را نداد.",
      true
    );

  } catch (error) {

    console.error(
      "Paste error:",
      error
    );

    setStatus(
      "امکان چسباندن متن وجود ندارد.",
      true
    );
  }
}


/* =========================
   SPEECH
========================= */

function speak(
  text,
  lang
) {

  if (!text) {

    setStatus(
      "متنی برای پخش وجود ندارد.",
      true
    );

    return;
  }


  if (
    !("speechSynthesis" in window)
  ) {

    setStatus(
      "پخش صدا در این مرورگر پشتیبانی نمی‌شود.",
      true
    );

    return;
  }


  speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  utterance.lang =
    lang === "fa"
      ? "fa-IR"
      : "en-US";


  utterance.rate =
    0.95;


  utterance.pitch =
    1;


  speechSynthesis.speak(
    utterance
  );
}


/* =========================
   SHARE
========================= */

async function shareResult() {

  const result =
    getResult();


  if (!result) {

    setStatus(
      "اول یک ترجمه انجام بده.",
      true
    );

    return;
  }


  const source =
    $("#sourceText").value;


  const shareText =
    `${source}\n\nترجمه:\n${result}`;


  try {

    if (
      navigator.share
    ) {

      await navigator.share({
        title:
          "ترجمه توسط ترجمان",

        text:
          shareText
      });

      return;
    }


    await copyText(
      shareText
    );


    setStatus(
      "اشتراک‌گذاری در این دستگاه در دسترس نیست؛ متن کپی شد."
    );

  } catch (error) {

    if (
      error?.name ===
      "AbortError"
    ) {
      return;
    }

    console.error(
      "Share error:",
      error
    );
  }
}


async function copyText(text) {

  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {

    await navigator.clipboard
      .writeText(text);

    return;
  }


  const area =
    document.createElement(
      "textarea"
    );

  area.value =
    text;

  area.style.position =
    "fixed";

  area.style.opacity =
    "0";

  document.body.appendChild(
    area
  );

  area.focus();
  area.select();

  document.execCommand(
    "copy"
  );

  area.remove();
}


/* =========================
   FAVORITES
========================= */

function favorite() {

  const result =
    getResult();


  if (!result) {

    setStatus(
      "اول یک ترجمه انجام بده.",
      true
    );

    return;
  }


  const item = {

    source:
      $("#sourceLang").value,

    target:
      $("#targetLang").value,

    text:
      $("#sourceText").value,

    translated:
      result,

    at:
      Date.now()
  };


  const exists =
    state.favorites.some(
      (x) =>
        x.text === item.text &&
        x.translated ===
          item.translated
    );


  if (exists) {

    setStatus(
      "این ترجمه قبلاً ذخیره شده است."
    );

    return;
  }


  state.favorites.unshift(
    item
  );


  state.favorites =
    state.favorites.slice(
      0,
      50
    );


  saveJSON(
    "translator_favorites",
    state.favorites
  );


  $("#favoriteBtn")
    .textContent =
    "★ ذخیره شد";


  setStatus(
    "ترجمه به علاقه‌مندی‌ها اضافه شد. ✓"
  );
}


/* =========================
   CLEAR HISTORY
========================= */

function clearHistory() {

  if (
    !state.history.length
  ) {
    return;
  }


  if (
    !confirm(
      "همه تاریخچه پاک شود؟"
    )
  ) {
    return;
  }


  state.history = [];


  saveJSON(
    "translator_history",
    []
  );


  renderHistory();


  setStatus(
    "تاریخچه پاک شد."
  );
}


/* =========================
   EXPORT
========================= */

function exportHistory() {

  if (
    !state.history.length
  ) {

    setStatus(
      "تاریخچه‌ای برای خروجی گرفتن وجود ندارد.",
      true
    );

    return;
  }


  const data =
    JSON.stringify(
      state.history,
      null,
      2
    );


  const blob =
    new Blob(
      [data],
      {
        type:
          "application/json;charset=utf-8"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;

  link.download =
    "translator-history.json";


  document.body.appendChild(
    link
  );

  link.click();

  link.remove();


  URL.revokeObjectURL(
    url
  );


  setStatus(
    "فایل تاریخچه ساخته شد. ✓"
  );
}


/* =========================
   RESET
========================= */

function resetApp() {

  if (
    !confirm(
      "همه اطلاعات برنامه، تاریخچه و علاقه‌مندی‌ها پاک شوند؟"
    )
  ) {
    return;
  }


  try {

    localStorage.removeItem(
      "translator_history"
    );

    localStorage.removeItem(
      "translator_favorites"
    );

    localStorage.removeItem(
      "translator_theme"
    );

  } catch (error) {

    console.error(
      error
    );
  }


  location.reload();
}


/* =========================
   THEME
========================= */

function initTheme() {

  let saved = null;

  try {

    saved =
      localStorage.getItem(
        "translator_theme"
      );

  } catch {
    saved = null;
  }


  if (
    saved === "light"
  ) {

    document.body.classList.add(
      "light"
    );
  }


  updateThemeButton();
}


function updateThemeButton() {

  $("#themeBtn")
    .textContent =
    document.body.classList.contains(
      "light"
    )
      ? "☀️"
      : "🌙";
}


function toggleTheme() {

  document.body.classList.toggle(
    "light"
  );


  const light =
    document.body.classList.contains(
      "light"
    );


  try {

    localStorage.setItem(
      "translator_theme",
      light
        ? "light"
        : "dark"
    );

  } catch {
    // Ignore storage errors.
  }


  updateThemeButton();
}


/* =========================
   EVENTS
========================= */

$("#themeBtn")
  .addEventListener(
    "click",
    toggleTheme
  );


$("#swapBtn")
  .addEventListener(
    "click",
    swapLanguages
  );


$("#translateBtn")
  .addEventListener(
    "click",
    translate
  );


$("#pasteBtn")
  .addEventListener(
    "click",
    pasteText
  );


$("#clearBtn")
  .addEventListener(
    "click",
    () => {

      $("#sourceText")
        .value = "";

      setResult("");

      setStatus("");

      updateCounts();

      $("#sourceText").focus();
    }
  );


$("#copyBtn")
  .addEventListener(
    "click",
    copyResult
  );


$("#shareBtn")
  .addEventListener(
    "click",
    shareResult
  );


$("#speakSourceBtn")
  .addEventListener(
    "click",
    () =>
      speak(
        $("#sourceText").value,
        $("#sourceLang").value ===
          "auto"
          ? detectLanguage(
              $("#sourceText").value
            )
          : $("#sourceLang").value
      )
  );


$("#speakTargetBtn")
  .addEventListener(
    "click",
    () =>
      speak(
        getResult(),
        $("#targetLang").value
      )
  );


$("#favoriteBtn")
  .addEventListener(
    "click",
    favorite
  );


$("#clearHistoryBtn")
  .addEventListener(
    "click",
    clearHistory
  );


$("#exportBtn")
  .addEventListener(
    "click",
    exportHistory
  );


$("#resetBtn")
  .addEventListener(
    "click",
    resetApp
  );


$("#historySearch")
  .addEventListener(
    "input",
    renderHistory
  );


$("#sourceText")
  .addEventListener(
    "input",
    updateCounts
  );


$("#sourceLang")
  .addEventListener(
    "change",
    normalizeLanguages
  );


$("#targetLang")
  .addEventListener(
    "change",
    normalizeLanguages
  );


$("#sourceText")
  .addEventListener(
    "keydown",
    (event) => {

      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key === "Enter"
      ) {

        event.preventDefault();

        translate();
      }
    }
  );


/* =========================
   INITIALIZE
========================= */

initTheme();

renderHistory();

setResult("");

updateCounts();