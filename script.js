let table = document.getElementById("tableBody");
let setSelect = document.getElementById("setSelect");

let allData = [];
let editingItem = null;

// ==========================
// MODAL
function openModal(url) {
  let modal = document.getElementById("fileModal");
  let frame = document.getElementById("fileFrame");

  if (!modal || !frame) {
    alert("Modal not found");
    return;
  }

  frame.src = url;
  modal.style.display = "block";
}

function closeModal() {
  document.getElementById("fileModal").style.display = "none";
  document.getElementById("fileFrame").src = "";
}

window.onclick = function (event) {
  if (event.target.id === "fileModal") closeModal();
}

window.addEventListener("click", function(e) {
  let modal = document.getElementById("imageModal");
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

// ==========================
// CLICK FILE (OPEN IN MODAL)
document.addEventListener("click", function(e) {
  let btn = e.target.closest(".view-file");

  if (btn) {
    let url = btn.getAttribute("data-url");

    if (!url || !url.startsWith("http")) {
      alert("File not found");
      return;
    }

    openModal(url); // ✅ use modal instead
  }
});

// ==========================
// ✅ FORMAT CURRENCY (WITH CENTS)
function formatCurrency(value) {
  if (!value) return "-";

  let num = parseFloat(value);

  if (isNaN(num)) return "-";

  return "RM " + num.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// ==========================
// ✅ INPUT PRICE (ALLOW DECIMAL)
document.getElementById("price").addEventListener("input", function(e) {

  let value = e.target.value
    .replace(/[^\d.]/g, "")        // allow dot
    .replace(/(\..*)\./g, '$1');   // only 1 dot

  e.target.value = value;
});

// ==========================
// FILE UPLOAD
async function uploadFile(file, path) {
  if (!file) return "";
  const ref = storage.ref().child(path);
  await ref.put(file);
  return await ref.getDownloadURL();
}

// ==========================
function formatDate(dateStr) {
  if (!dateStr) return "-";
  let d = new Date(dateStr);
  if (isNaN(d)) return "-";
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

// ==========================
function getStatus(cal, validity) {
  if (!cal || !validity) return { expiry: "-", label: "-", class: "" };

  let expiry = new Date(cal);
  expiry.setFullYear(expiry.getFullYear() + Number(validity));

  let diff = (expiry - new Date()) / (1000*60*60*24);

  if (diff < 0) return { expiry: formatDate(expiry), label: "❌ EXPIRED", class:"status-expired" };
  if (diff <= 30) return { expiry: formatDate(expiry), label: "⚠️ DUE SOON", class:"status-warning" };

  return { expiry: formatDate(expiry), label: "✅ OK", class:"status-ok" };
}

// ==========================
// ADD SET
function addSet() {
  let name = document.getElementById("setName").value.trim();
  let serial = document.getElementById("setSerial").value.trim();

  if (!name) return alert("Enter set name");

  db.collection("equipment_sets").add({
    name,
    serial,
    createdAt: Date.now()
  });

  document.getElementById("setName").value = "";
  document.getElementById("setSerial").value = "";
}

// ==========================
// LOAD DROPDOWN
function loadSetDropdown() {
  db.collection("equipment_sets")
    .orderBy("createdAt", "asc")
    .onSnapshot(snap => {
      setSelect.innerHTML = "";
      snap.forEach(doc => {
        let s = doc.data();
        setSelect.innerHTML += `<option value="${doc.id}">${s.name} (${s.serial})</option>`;
      });
    });
}

// ==========================
// ADD / UPDATE ITEM
async function addEquipment() {

  let setId = setSelect.value;

  let receiptFile = document.getElementById("receiptFile").files[0];
  let certFile = document.getElementById("certFile").files[0];
  let imageFile = document.getElementById("itemImage").files[0];

  let receiptUrl = await uploadFile(receiptFile, `receipt/${Date.now()}`);
  let certUrl = await uploadFile(certFile, `cert/${Date.now()}`);
  let imageUrl = await uploadFile(imageFile, `itemImage/${Date.now()}`);

  let oldItem = null;

  if (editingItem) {
    let set = allData.find(s => s.id === editingItem.setId);
    oldItem = set?.items.find(i => i.id === editingItem.id);
  }

  let item = {
    tag: document.getElementById("tag").value.trim(),
    desc: document.getElementById("desc").value.trim(),
    resit: document.getElementById("resit").value.trim(),
    qty: document.getElementById("qty").value.trim(),
    price: document.getElementById("price").value, // ✅ KEEP DECIMAL
    cal: document.getElementById("cal").value,
    validity: document.getElementById("validity").value,
    date: document.getElementById("date").value,

    createdAt: editingItem ? oldItem?.createdAt || Date.now() : Date.now(),

    receiptUrl: receiptUrl || (oldItem ? oldItem.receiptUrl : ""),
    certUrl: certUrl || (oldItem ? oldItem.certUrl : ""),
    imageUrl: imageUrl || (oldItem ? oldItem.imageUrl : ""),
  };

  if (!item.tag || !item.desc) {
    alert("Fill Tag & Description");
    return;
  }

  if (editingItem) {
    await db.collection("equipment_sets")
      .doc(editingItem.setId)
      .collection("items")
      .doc(editingItem.id)
      .set(item, { merge: true });

    editingItem = null;
  } else {
    await db.collection("equipment_sets")
      .doc(setId)
      .collection("items")
      .add(item);
  }

  clearForm();
}

// ==========================
// RENDER
function renderData(filtered = null) {

  let data = filtered || allData;
  table.innerHTML = "";

  data.forEach(set => {

    if (set.items.length === 0) return;

    set.items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    table.innerHTML += `
      <tr class="group-row">
        <td colspan="9">▶ <b>${set.name} (${set.serial})</b></td>
        <td><button onclick="deleteSet('${set.id}')">🗑</button></td>
      </tr>
    `;

    set.items.forEach((item, i) => {

      let s = getStatus(item.cal, item.validity);

      table.innerHTML += `
      <tr>
        <td>${i+1}</td>
        <td>
          <span class="tag-link" onclick="handleTagClick('${item.imageUrl || ""}')">
            ${item.tag}
          </span>
        </td>
        <td>${item.desc}</td>

        <td>
          ${item.resit || "-"}<br>
          ${item.receiptUrl && item.receiptUrl.startsWith("http") ? 
            `<button class="file-btn view-file" data-url="${item.receiptUrl}">📄 Receipt</button>` : ""}
          ${item.certUrl && item.certUrl.startsWith("http") ? 
            `<br><button class="file-btn view-file" data-url="${item.certUrl}">📑 Cert</button>` : ""}
        </td>

        <td>${s.expiry}</td>
        <td><span class="label ${s.class}">${s.label}</span></td>
        <td>${item.qty}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${formatDate(item.date)}</td>

        <td>
          <button onclick="editItem('${set.id}','${item.id}')">✏️</button>
          <button onclick="deleteItem('${set.id}','${item.id}')">🗑</button>
        </td>
      </tr>
      `;
    });

  });
}

// ==========================
// LOAD DATA
function loadData() {

  db.collection("equipment_sets")
    .orderBy("createdAt", "asc")
    .onSnapshot(setSnap => {

      allData = [];

      setSnap.forEach(setDoc => {

        let setObj = {
          id: setDoc.id,
          name: setDoc.data().name,
          serial: setDoc.data().serial,
          items: []
        };

        db.collection("equipment_sets")
          .doc(setDoc.id)
          .collection("items")
          .onSnapshot(itemSnap => {

            setObj.items = [];
            itemSnap.forEach(doc => {
              setObj.items.push({ id: doc.id, ...doc.data() });
            });

            renderData();
          });

        allData.push(setObj);
      });

    });
}

// ==========================
// SEARCH
function searchTable() {

  let keyword = document.getElementById("search").value.toLowerCase().trim();

  if (!keyword) {
    renderData();
    return;
  }

  let filtered = [];

  allData.forEach(set => {

    let setName = (set.name || "").toLowerCase();
    let setSerial = String(set.serial || "").toLowerCase();

    let matchSet = setName.includes(keyword) || setSerial.includes(keyword);

    let filteredItems = set.items.filter(item => {

      let tag = (item.tag || "").toLowerCase();
      let desc = (item.desc || "").toLowerCase();
      let resit = (item.resit || "").toLowerCase();
      let qty = (item.qty || "").toLowerCase();
      let price = String(item.price || "");
      let purchase = (item.date || "").toLowerCase();

      let statusObj = getStatus(item.cal, item.validity);
      let statusText = (statusObj.label || "")
        .replace(/[^\w\s]/gi, "")
        .toLowerCase();

      return (
        tag.includes(keyword) ||
        desc.includes(keyword) ||
        resit.includes(keyword) ||
        qty.includes(keyword) ||
        price.includes(keyword) ||
        purchase.includes(keyword) ||
        statusText.includes(keyword)
      );

    });

    if (matchSet) {
      filtered.push(set);
    } else if (filteredItems.length > 0) {
      filtered.push({ ...set, items: filteredItems });
    }

  });

  renderData(filtered);
}

// ==========================
window.onload = function () {
  loadSetDropdown();
  loadData();
};

function editItem(setId, itemId) {

  let set = allData.find(s => s.id === setId);
  if (!set) return;

  let item = set.items.find(i => i.id === itemId);
  if (!item) return;

  // fill form
  document.getElementById("tag").value = item.tag || "";
  document.getElementById("desc").value = item.desc || "";
  document.getElementById("resit").value = item.resit || "";
  document.getElementById("qty").value = item.qty || "";
  document.getElementById("price").value = item.price || "";
  document.getElementById("cal").value = item.cal || "";
  document.getElementById("validity").value = item.validity || "";
  document.getElementById("date").value = item.date || "";

  setSelect.value = setId;

  editingItem = {
    setId: setId,
    id: itemId
  };

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteItem(setId, itemId) {

  if (!confirm("Delete this item?")) return;

  await db.collection("equipment_sets")
    .doc(setId)
    .collection("items")
    .doc(itemId)
    .delete();
}

async function deleteSet(setId) {

  if (!confirm("Delete entire equipment set?")) return;

  let itemsSnap = await db.collection("equipment_sets")
    .doc(setId)
    .collection("items")
    .get();

  // delete all items first
  let batch = db.batch();

  itemsSnap.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  // delete set
  await db.collection("equipment_sets")
    .doc(setId)
    .delete();
}

function clearForm() {
  document.getElementById("tag").value = "";
  document.getElementById("desc").value = "";
  document.getElementById("resit").value = "";
  document.getElementById("qty").value = "";
  document.getElementById("price").value = "";
  document.getElementById("cal").value = "";
  document.getElementById("validity").value = "";
  document.getElementById("date").value = "";

  document.getElementById("receiptFile").value = "";
  document.getElementById("certFile").value = "";
  document.getElementById("itemImage").value = "";

  editingItem = null;
}

function showImage(url) {

  let modal = document.getElementById("imageModal");
  let img = document.getElementById("modalImg");

  if (!modal || !img) {
    console.error("Modal not found");
    return;
  }

  img.src = url;
  modal.style.display = "flex"; // better center
}

function closeImage() {
  document.getElementById("imageModal").style.display = "none";
}

// optional: click outside close
window.addEventListener("click", function(e){
  let modal = document.getElementById("imageModal");
  if (e.target === modal) closeImage();
});

function handleTagClick(url) {

  if (!url) {
    alert("No image available for this item");
    return;
  }

  showImage(url);
}