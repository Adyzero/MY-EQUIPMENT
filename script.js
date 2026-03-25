let table = document.getElementById("tableBody");
let editId = null;

let currentFilter = "ALL";
let alertShown = false;

// =====================
// 🔧 UTIL
// =====================
function parsePrice(value) {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/,/g, "")) || 0;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  let d = new Date(dateStr);
  let day = d.getDate().toString().padStart(2, "0");
  let month = (d.getMonth() + 1).toString().padStart(2, "0");
  let year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// =====================
// 🔥 EXPIRY
// =====================
function getExpiryStatus(calDate, validity) {
  if (!calDate || !validity) {
    return { expiry: "-", label: "OK", class: "", priority: 3 };
  }

  let cal = new Date(calDate);
  let expiry = new Date(cal);
  expiry.setFullYear(expiry.getFullYear() + parseInt(validity));

  let today = new Date();
  let diffDays = (expiry - today) / (1000 * 60 * 60 * 24);

  let label = "OK";
  let cssClass = "";
  let priority = 3;

  if (diffDays < 0) {
    label = "EXPIRED";
    cssClass = "expired";
    priority = 1;
  } else if (diffDays <= 30) {
    label = "DUE SOON";
    cssClass = "warning";
    priority = 2;
  }

  return {
    expiry: formatDate(expiry),
    label,
    class: cssClass,
    priority
  };
}

// =====================
// 🔥 FILTER
// =====================
function setFilter(type) {
  currentFilter = type;
  loadData();
}

// =====================
// 🔥 LOAD DATA
// =====================
function loadData() {

  db.collection("equipment").onSnapshot(snapshot => {

    let data = [];
    let total = 0;
    let expiredCount = 0;
    let dueSoonCount = 0;

    snapshot.forEach(doc => {

      let item = doc.data();
      item.id = doc.id;

      let result = getExpiryStatus(item.cal, item.validity);
      item.expiry = result.expiry;
      item.status = result;

      if (item.status.label === "EXPIRED") expiredCount++;
      if (item.status.label === "DUE SOON") dueSoonCount++;

      item.priceValue = parsePrice(item.price);
      total += item.priceValue;

      data.push(item);
    });

    data.sort((a, b) => a.status.priority - b.status.priority);

    let html = "";

    data.forEach((item, index) => {

      if (currentFilter !== "ALL" && item.status.label !== currentFilter) return;

      let labelClass = "label-ok";
      if (item.status.label === "EXPIRED") labelClass = "label-expired";
      else if (item.status.label === "DUE SOON") labelClass = "label-warning";

      // 📄 RECEIPT
      let receiptHTML = "-";
      if (item.receiptUrl) {
        if (item.receiptUrl.match(/\.(jpg|jpeg|png)$/i)) {
          receiptHTML = `<img src="${item.receiptUrl}" style="width:60px;height:60px;cursor:pointer" onclick="openModal('${item.receiptUrl}')">`;
        } else {
          receiptHTML = `<a href="${item.receiptUrl}" target="_blank">📄 View</a>`;
        }
      }

      // 🧾 CERTIFICATE
      let certHTML = "-";
      if (item.certUrl) {
        if (item.certUrl.match(/\.(jpg|jpeg|png)$/i)) {
          certHTML = `<img src="${item.certUrl}" style="width:60px;height:60px;cursor:pointer" onclick="openModal('${item.certUrl}')">`;
        } else {
          certHTML = `<a href="${item.certUrl}" target="_blank">📄 View</a>`;
        }
      }

      html += `
        <tr class="${item.status.class}">
          <td>${index + 1}</td>
          <td>${item.tag || ""}</td>
          <td>${item.desc || ""}</td>
          <td>${item.serial || ""}</td>
          <td>${item.resit || ""}</td>
          <td>${receiptHTML}</td>
          <td>${certHTML}</td>
          <td>${item.expiry}</td>
          <td><span class="label ${labelClass}">${item.status.label}</span></td>
          <td>${item.qty || ""}</td>
          <td>${item.price || ""}</td>
          <td>${formatDate(item.date)}</td>
          <td>
            <button class="btn-edit" onclick="editItem('${item.id}')">✏️</button>
            <button class="btn-delete" onclick="deleteItem('${item.id}')">🗑</button>
          </td>
        </tr>
      `;
    });

    table.innerHTML = html;

    totalItems.innerText = data.length;
    totalValue.innerText = total.toLocaleString(undefined, { minimumFractionDigits: 2 });

    if (!alertShown && (expiredCount || dueSoonCount)) {
      alert(`❌ ${expiredCount} expired\n⚠️ ${dueSoonCount} due soon`);
      alertShown = true;
    }

  });
}

// =====================
// 🔥 ADD / UPDATE
// =====================
function addEquipment() {

  let receiptFile = receiptFileInput.files[0];
  let certFile = certFileInput.files[0];

  let newItem = {
    tag: tag.value.trim(),
    desc: desc.value.trim(),
    serial: serial.value.trim(),
    resit: resit.value.trim(),
    cal: cal.value,
    validity: validity.value,
    qty: qty.value.trim(),
    price: price.value.trim(),
    date: date.value,
    receiptUrl: "",
    certUrl: ""
  };

  if (!newItem.tag || !newItem.desc) {
    alert("Fill Tag & Description");
    return;
  }

  uploadFiles(newItem, receiptFile, certFile);
}

// =====================
// 🔥 UPLOAD
// =====================
function uploadFiles(item, receiptFile, certFile) {

  let tasks = [];

  if (receiptFile) {
    let ref = storage.ref("receipts/" + Date.now() + "_" + receiptFile.name);
    tasks.push(ref.put(receiptFile)
      .then(s => s.ref.getDownloadURL())
      .then(url => item.receiptUrl = url));
  }

  if (certFile) {
    let ref = storage.ref("certificates/" + Date.now() + "_" + certFile.name);
    tasks.push(ref.put(certFile)
      .then(s => s.ref.getDownloadURL())
      .then(url => item.certUrl = url));
  }

  Promise.all(tasks).then(() => {

    if (editId) {
      db.collection("equipment").doc(editId).get().then(doc => {
        let old = doc.data();

        item.receiptUrl = item.receiptUrl || old.receiptUrl || "";
        item.certUrl = item.certUrl || old.certUrl || "";

        db.collection("equipment").doc(editId).update(item).then(() => {
          editId = null;
          clearForm();
        });
      });
    } else {
      db.collection("equipment").add(item).then(() => {
        clearForm();
      });
    }

  });
}

// =====================
// ✏️ EDIT
// =====================
function editItem(id) {
  db.collection("equipment").doc(id).get().then(doc => {
    let item = doc.data();

    tag.value = item.tag || "";
    desc.value = item.desc || "";
    serial.value = item.serial || "";
    resit.value = item.resit || "";
    cal.value = item.cal || "";
    validity.value = item.validity || "";
    qty.value = item.qty || "";
    price.value = item.price || "";
    date.value = item.date || "";

    editId = id;
  });
}

// =====================
// 🗑 DELETE
// =====================
function deleteItem(id) {
  if (confirm("Delete this item?")) {
    db.collection("equipment").doc(id).delete();
  }
}

// =====================
// 🔍 SEARCH
// =====================
function searchTable() {
  let input = search.value.toLowerCase();
  let rows = document.querySelectorAll("#tableBody tr");

  rows.forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(input) ? "" : "none";
  });
}

// =====================
// 📥 EXPORT
// =====================
function exportToExcel() {
  let rows = document.querySelectorAll("table tr");
  let csv = [];

  rows.forEach(row => {
    let cols = row.querySelectorAll("td, th");
    let rowData = [];
    cols.forEach(col => rowData.push(`"${col.innerText}"`));
    csv.push(rowData.join(","));
  });

  let blob = new Blob([csv.join("\n")], { type: "text/csv" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "MY-EQUIPMENT.csv";
  a.click();
}

// =====================
// 🧹 CLEAR
// =====================
function clearForm() {
  tag.value = "";
  desc.value = "";
  serial.value = "";
  resit.value = "";
  cal.value = "";
  validity.value = "";
  qty.value = "";
  price.value = "";
  date.value = "";
  receiptFile.value = "";
  certFile.value = "";
}

// =====================
// 🖼 MODAL + ZOOM
// =====================
let modal = document.getElementById("imageModal");
let modalImg = document.getElementById("modalImg");

let scale = 1;
let posX = 0, posY = 0;
let isDragging = false;
let startX, startY;

function openModal(src) {
  modal.style.display = "block";
  modalImg.src = src;

  scale = 1;
  posX = 0;
  posY = 0;
  updateTransform();
}

function closeModal() {
  modal.style.display = "none";
}

// zoom mouse
modalImg.addEventListener("wheel", e => {
  e.preventDefault();
  scale += e.deltaY * -0.001;
  scale = Math.min(Math.max(1, scale), 5);
  updateTransform();
});

// drag
modalImg.addEventListener("mousedown", e => {
  isDragging = true;
  startX = e.clientX - posX;
  startY = e.clientY - posY;
});

document.addEventListener("mousemove", e => {
  if (!isDragging) return;
  posX = e.clientX - startX;
  posY = e.clientY - startY;
  updateTransform();
});

document.addEventListener("mouseup", () => isDragging = false);

// mobile pinch
let initialDistance = null;

modalImg.addEventListener("touchmove", e => {
  if (e.touches.length === 2) {
    let dx = e.touches[0].clientX - e.touches[1].clientX;
    let dy = e.touches[0].clientY - e.touches[1].clientY;
    let distance = Math.sqrt(dx * dx + dy * dy);

    if (!initialDistance) initialDistance = distance;

    let zoom = distance / initialDistance;
    scale = Math.min(Math.max(1, zoom), 5);
    updateTransform();
  }
});

modalImg.addEventListener("touchend", () => {
  initialDistance = null;
});

function updateTransform() {
  modalImg.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
}

// =====================
window.onload = function () {
  loadData();
};