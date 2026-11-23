
// ===================================
// A-FINANCE - SISTEM KEUANGAN
// ===================================

console.log("A-Finance berhasil dijalankan!");

// 1. DATABASE
const DB_NAME = "AFinanceDB";
const DB_VERSION = 1;
const STORE_NAME = "transactions";

let db;
let imageUrls = [];
let reportMode = "daily";
let selectedWeekStart = getWeekStart(new Date());

const form = document.getElementById("transactionForm");
const list = document.getElementById("transactionList");

const rupiah = (number) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(number);

// 2. FORMAT TANGGAL LOKAL
function dateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getWeekStart(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);

    const day = result.getDay();
    const difference = day === 0 ? -6 : 1 - day;

    result.setDate(result.getDate() + difference);

    return result;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDate(date) {
    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

// 3. MEMBUKA DATABASE
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                    autoIncrement: true
                });

                store.createIndex("date", "date");
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 4. MENGAMBIL TRANSAKSI
function getTransactions() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 5. MENYIMPAN TRANSAKSI
function saveTransaction(data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 6. MENGHAPUS TRANSAKSI
function deleteTransaction(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// 7. MENGHITUNG LAPORAN
function calculateReport(transactions) {
    let income = 0;
    let expense = 0;

    transactions.forEach(item => {
        if (item.type === "income") {
            income += item.amount;
        } else if (item.type === "expense") {
            expense += item.amount;
        }
    });

    return {
        income,
        expense,
        balance: income - expense
    };
}

// 8. MENAMPILKAN LAPORAN
function displayReport(report) {
    document.getElementById("reportIncome").textContent =
        rupiah(report.income);

    document.getElementById("reportExpense").textContent =
        rupiah(report.expense);

    document.getElementById("reportBalance").textContent =
        rupiah(report.balance);
}

// 9. REKAP HARIAN
async function renderDailyReport() {
    const selectedDate = document.getElementById("reportDate").value;

    const transactions = await getTransactions();

    const dailyTransactions = transactions.filter(item =>
        item.date === selectedDate
    );

    displayReport(calculateReport(dailyTransactions));
}

// 10. REKAP 7 HARI
async function renderWeeklyReport() {
    const transactions = await getTransactions();

    const weekEnd = addDays(selectedWeekStart, 6);

    const start = dateString(selectedWeekStart);
    const end = dateString(weekEnd);

    const weeklyTransactions = transactions.filter(item =>
        item.date >= start && item.date <= end
    );

    displayReport(calculateReport(weeklyTransactions));

    document.getElementById("weekLabel").textContent =
        `${formatDate(selectedWeekStart)} - ${formatDate(weekEnd)}`;

    // Tidak boleh berpindah ke minggu mendatang
    document.getElementById("nextWeek").disabled =
        dateString(addDays(weekEnd, 1)) > dateString(new Date());
}

// 11. MEMILIH JENIS LAPORAN
async function renderReport() {
    if (reportMode === "daily") {
        await renderDailyReport();
    } else {
        await renderWeeklyReport();
    }
}

// 12. TOMBOL HARIAN
document.getElementById("dailyTab").addEventListener("click", async () => {
    reportMode = "daily";

    document.getElementById("dailyTab").classList.add("active");
    document.getElementById("weeklyTab").classList.remove("active");

    document.getElementById("reportDate").hidden = false;
    document.getElementById("weekNavigation").hidden = true;

    await renderReport();
});

// 13. TOMBOL MINGGUAN
document.getElementById("weeklyTab").addEventListener("click", async () => {
    reportMode = "weekly";

    document.getElementById("weeklyTab").classList.add("active");
    document.getElementById("dailyTab").classList.remove("active");

    document.getElementById("reportDate").hidden = true;
    document.getElementById("weekNavigation").hidden = false;

    await renderReport();
});

// 14. NAVIGASI MINGGU
document.getElementById("previousWeek").addEventListener("click", async () => {
    selectedWeekStart = addDays(selectedWeekStart, -7);
    await renderReport();
});

document.getElementById("nextWeek").addEventListener("click", async () => {
    const nextStart = addDays(selectedWeekStart, 7);
    const nextEnd = addDays(nextStart, 6);

    if (dateString(nextEnd) > dateString(new Date())) {
        return;
    }

    selectedWeekStart = nextStart;
    await renderReport();
});

document.getElementById("reportDate").addEventListener("change", renderReport);

// 15. MENAMPILKAN SEMUA TRANSAKSI
async function renderTransactions() {
    imageUrls.forEach(url => URL.revokeObjectURL(url));
    imageUrls = [];

    const transactions = await getTransactions();

    // Saldo keseluruhan
    const total = calculateReport(transactions);

    document.getElementById("totalIncome").textContent =
        rupiah(total.income);

    document.getElementById("totalExpense").textContent =
        rupiah(total.expense);

    document.getElementById("balance").textContent =
        rupiah(total.balance);

    list.replaceChildren();

    if (transactions.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = "Belum ada transaksi.";

        list.appendChild(empty);
        return;
    }

    transactions.sort((a, b) =>
        b.date.localeCompare(a.date) || b.id - a.id
    );

    transactions.forEach(item => {
        const card = document.createElement("div");
        card.className = "transaction";

        const title = document.createElement("h3");
        title.textContent = item.category;

        const date = document.createElement("p");
        date.textContent = item.date;

        const note = document.createElement("p");
        note.textContent = item.note || "Tanpa keterangan";

        const amount = document.createElement("div");
        amount.className = "amount " +
            (item.type === "income" ? "in" : "out");

        amount.textContent =
            (item.type === "income" ? "+ " : "- ") +
            rupiah(item.amount);

        card.append(title, date, note, amount);

        if (item.photo) {
            const img = document.createElement("img");
            const url = URL.createObjectURL(item.photo);

            imageUrls.push(url);
            img.src = url;
            img.alt = "Bukti transaksi";

            card.appendChild(img);
        }

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Hapus";

        deleteButton.addEventListener("click", async () => {
            if (!confirm("Hapus transaksi ini?")) return;

            await deleteTransaction(item.id);
            await renderTransactions();
            await renderReport();
        });

        card.appendChild(deleteButton);
        list.appendChild(card);
    });
}

// 16. INPUT TANGGAL OTOMATIS
const today = dateString(new Date());

document.getElementById("date").value = today;
document.getElementById("reportDate").value = today;

// 17. MENYIMPAN FORM TRANSAKSI
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const type = document.getElementById("type").value;
    const amount = Number(document.getElementById("amount").value);
    const category = document.getElementById("category").value.trim();
    const date = document.getElementById("date").value;
    const note = document.getElementById("note").value.trim();
    const photoFile = document.getElementById("photo").files[0];

    if (!Number.isSafeInteger(amount) || amount <= 0) {
        alert("Masukkan nominal yang valid.");
        return;
    }

    if (!category || !date) {
        alert("Kategori dan tanggal wajib diisi.");
        return;
    }

    if (photoFile && !photoFile.type.startsWith("image/")) {
        alert("File harus berupa gambar.");
        return;
    }

    if (photoFile && photoFile.size > 5 * 1024 * 1024) {
        alert("Ukuran foto maksimal 5 MB.");
        return;
    }

    const data = {
        type,
        amount,
        category,
        date,
        note,
        photo: photoFile || null,
        createdAt: new Date().toISOString()
    };

    try {
        await saveTransaction(data);

        form.reset();

        document.getElementById("date").value = dateString(new Date());

        await renderTransactions();
        await renderReport();

        alert("Transaksi berhasil disimpan!");
    } catch (error) {
        console.error(error);
        alert("Transaksi gagal disimpan. Periksa penyimpanan browser.");
    }
});

// 18. MENJALANKAN APLIKASI
async function startApp() {
    try {
        db = await openDatabase();

        await renderTransactions();
        await renderReport();

    } catch (error) {
        console.error(error);
        alert("Database gagal dibuka. Periksa Console browser.");
    }
}

startApp();
