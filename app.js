
const sourceLang = document.getElementById('sourceLang');
const targetLang = document.getElementById('targetLang');
const sourceText = document.getElementById('sourceText');
const resultText = document.getElementById('resultText');

const translateBtn = document.getElementById('translateBtn');
const swapBtn = document.getElementById('swapBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const speakBtn = document.getElementById('speakBtn');
const pasteBtn = document.getElementById('pasteBtn');

const message = document.getElementById('message');
const charCount = document.getElementById('charCount');
const resultLanguage = document.getElementById('resultLanguage');
const resultStatus = document.getElementById('resultStatus');

const languages = {
    fa: 'فارسی',
    en: 'انگلیسی',
    tr: 'ترکی استانبولی',
    ar: 'عربی',
    auto: 'تشخیص خودکار'
};

function notify(text) {
    message.textContent = text;
}

function updateCount() {
    charCount.textContent =
        `${sourceText.value.length} / ۵۰۰۰`;
}

function updateResultLanguage() {
    resultLanguage.textContent =
        languages[targetLang.value];
}

sourceText.addEventListener('input', updateCount);
targetLang.addEventListener('change', updateResultLanguage);

swapBtn.addEventListener('click', () => {
    if (sourceLang.value === 'auto') {
        notify('برای جابه‌جایی، اول زبان مبدأ را مشخص کن.');
        return;
    }

    const oldSource = sourceLang.value;
    sourceLang.value = targetLang.value;
    targetLang.value = oldSource;

    const oldText = sourceText.value;
    sourceText.value = resultText.textContent ===
        'ترجمه شما اینجا نمایش داده می‌شود...'
        ? ''
        : resultText.textContent;

    resultText.textContent = oldText ||
        'ترجمه شما اینجا نمایش داده می‌شود...';

    updateCount();
    updateResultLanguage();
    notify('زبان‌ها جابه‌جا شدند.');
});

clearBtn.addEventListener('click', () => {
    sourceText.value = '';
    resultText.textContent =
        'ترجمه شما اینجا نمایش داده می‌شود...';

    updateCount();
    notify('متن پاک شد.');
});

pasteBtn.addEventListener('click', async () => {
    try {
        sourceText.value = await navigator.clipboard.readText();
        updateCount();
        notify('متن از حافظه کپی شد.');
    } catch {
        notify('دسترسی به حافظه کلیپ‌بورد ممکن نیست.');
    }
});

translateBtn.addEventListener('click', translate);

async function translate() {
    const text = sourceText.value.trim();

    if (!text) {
        notify('لطفاً متنی برای ترجمه وارد کن.');
        return;
    }

    if (sourceLang.value === targetLang.value) {
        notify('زبان مبدأ و مقصد نباید یکسان باشند.');
        return;
    }

    const from = sourceLang.value === 'auto'
        ? 'autodetect'
        : sourceLang.value;

    const to = targetLang.value;

    translateBtn.disabled = true;
    translateBtn.querySelector('span').textContent =
        'در حال ترجمه...';

    resultText.textContent = 'در حال دریافت ترجمه...';
    resultStatus.textContent = 'در حال پردازش';

    try {
        const url = new URL(
            'https://api.mymemory.translated.net/get'
        );

        url.searchParams.set('q', text);
        url.searchParams.set('langpair', `${from}|${to}`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('خطای ارتباط با سرویس ترجمه');
        }

        const data = await response.json();

        if (data.responseStatus !== 200) {
            throw new Error(
                data.responseDetails || 'ترجمه انجام نشد.'
            );
        }

        const translated =
            data.responseData?.translatedText;

        if (!translated) {
            throw new Error('ترجمه‌ای دریافت نشد.');
        }

        resultText.textContent = translated;
        resultStatus.textContent = 'ترجمه انجام شد';
        notify('ترجمه با موفقیت انجام شد.');

    } catch (error) {
        resultText.textContent =
            'ترجمه انجام نشد. اتصال اینترنت یا سرویس ترجمه را بررسی کن.';

        resultStatus.textContent = 'خطا';
        notify(error.message);

    } finally {
        translateBtn.disabled = false;
        translateBtn.querySelector('span').textContent =
            'ترجمه کن';
    }
}

copyBtn.addEventListener('click', async () => {
    const text = resultText.textContent;

    if (!text || text === 'ترجمه شما اینجا نمایش داده می‌شود...') {
        notify('متنی برای کپی وجود ندارد.');
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        notify('ترجمه کپی شد.');
    } catch {
        notify('کپی خودکار در این محیط پشتیبانی نمی‌شود.');
    }
});

speakBtn.addEventListener('click', () => {
    const text = resultText.textContent;

    if (!text || text === 'ترجمه شما اینجا نمایش داده می‌شود...') {
        notify('متنی برای پخش وجود ندارد.');
        return;
    }

    if (!('speechSynthesis' in window)) {
        notify('پخش صدا در این مرورگر پشتیبانی نمی‌شود.');
        return;
    }

    speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    const lang = targetLang.value;
    speech.lang = {
        fa: 'fa-IR',
        en: 'en-US',
        tr: 'tr-TR',
        ar: 'ar-SA'
    }[lang];

    speech.rate = 0.9;
    speechSynthesis.speak(speech);
});

updateCount();
updateResultLanguage();
