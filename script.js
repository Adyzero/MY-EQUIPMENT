let table = document.getElementById("tableBody");
let setSelect = document.getElementById("setSelect");

// ==========================
// FORMAT DATE
// ==========================
function formatDate(dateStr) {
  if (!dateStr) return "-";
  let d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

// ==========================
// EXPIRY
// ==========================
function getStatus(cal, validity) {
  if (!cal || !validity) return { expiry: "-", label: "OK", class: "label-ok" };

  let expiry = new Date(cal);
  expiry.setFullYear(expiry.getFullYear() + parseInt(validity));

  let diff = (expiry - new Date()) / (1000*60*60*24);

  if (diff < 0) return { expiry: formatDate(expiry), label: "EXPIRED", class: "label-expired" };
  if (diff <= 30) return { expiry: formatDate(expiry), label: "DUE SOON", class: "label-warning" };
  return { expiry: formatDate(expiry), label: "OK", class: "label-ok" };
}

// ==========================
// ADD SET
// ==========================
function addSet() {
  let name = document.getElementById("setName").value;
  let serial = document.getElementById("setSerial").value;

  if (!name) return alert("Enter set name");

  db.collection("equipment_sets").add({ name, serial }).then(() => {
    document.getElementById("setName").value = "";
    document.getElementById("setSerial").value = "";
  });
}

// ==========================
// LOAD DROPDOWN
// ==========================
function loadSetDropdown() {
  db.collection("equipment_sets").onSnapshot(snap => {
    setSelect.innerHTML = "";
    snap.forEach(doc => {
      let s = doc.data();
      setSelect.innerHTML += `<option value="${doc.id}">${s.name} (${s.serial})</option>`;
    });
  });
}

// ==========================
// ADD ITEM
// ==========================
function addEquipment() {

  let setId = setSelect.value;
  if (!setId) return alert("Select set");

  let item = {
    tag: tag.value,
    desc: desc.value,
    resit: resit.value,
    qty: qty.value,
    price: price.value,
    cal: cal.value,
    validity: validity.value,
    date: date.value,
    receiptUrl: "",
    certUrl: ""
  };

  if (!item.tag || !item.desc) return alert("Fill Tag & Description");

  let receiptFile = receiptFileInput.files[0];
  let certFile = certFileInput.files[0];

  uploadFiles(item, receiptFile, certFile, setId);
}

// ==========================
// UPLOAD FILES
// ==========================
function uploadFiles(item, receiptFile, certFile, setId) {

  let tasks = [];

  if (receiptFile) {
    let ref = storage.ref("receipts/" + Date.now());
    tasks.push(ref.put(receiptFile).then(r=>r.ref.getDownloadURL()).then(u=>item.receiptUrl=u));
  }

  if (certFile) {
    let ref = storage.ref("certificates/" + Date.now());
    tasks.push(ref.put(certFile).then(r=>r.ref.getDownloadURL()).then(u=>item.certUrl=u));
  }

  Promise.all(tasks).then(()=>{
    db.collection("equipment_sets").doc(setId).collection("items").add(item);
    clearForm();
  });
}

// ==========================
// DELETE ITEM (WORKING)
// ==========================
function deleteItem(setId, itemId) {

  if (!confirm("Delete item?")) return;

  db.collection("equipment_sets")
    .doc(setId)
    .collection("items")
    .doc(itemId)
    .delete()
    .then(()=>alert("Deleted"))
    .catch(err=>alert(err.message));
}

// ==========================
// DELETE SET
// ==========================
function deleteSet(setId) {

  if (!confirm("Delete set + items?")) return;

  let ref = db.collection("equipment_sets").doc(setId);

  ref.collection("items").get().then(snap=>{
    let batch = db.batch();
    snap.forEach(doc=>batch.delete(doc.ref));
    batch.commit().then(()=>ref.delete());
  });
}

// ==========================
// LOAD DATA (🔥 CLEAN)
// ==========================
function loadData() {

  db.collection("equipment_sets").onSnapshot(setSnap => {

    let html = "";

    setSnap.forEach(setDoc => {

      let set = setDoc.data();
      let setId = setDoc.id;

      html += `
        <tr class="group-row">
          <td colspan="10">
            ▶ <b>${set.name} (${set.serial})</b>
            <button class="btn-delete" style="float:right"
              onclick="event.stopPropagation(); deleteSet('${setId}')">
              🗑
            </button>
          </td>
        </tr>
      `;

      db.collection("equipment_sets")
        .doc(setId)
        .collection("items")
        .onSnapshot(itemSnap => {

          let itemHTML = "";
          let i = 1;

          itemSnap.forEach(doc => {
            let item = doc.data();
            let s = getStatus(item.cal, item.validity);

            itemHTML += `
              <tr>
                <td>${i++}</td>
                <td>${item.tag}</td>
                <td>${item.desc}</td>
                <td>${item.resit}</td>
                <td>${s.expiry}</td>
                <td><span class="${s.class}">${s.label}</span></td>
                <td>${item.qty}</td>
                <td>${item.price}</td>
                <td>${formatDate(item.date)}</td>
                <td>
                  <button class="btn-delete"
                    onclick="event.stopPropagation(); deleteItem('${setId}','${doc.id}')">
                    🗑
                  </button>
                </td>
              </tr>
            `;
          });

          table.innerHTML = html + itemHTML;

        });

    });

  });
}

// ==========================
function clearForm() {
  document.querySelectorAll("input").forEach(i => i.value = "");
}

// ==========================
window.onload = function () {
  loadSetDropdown();
  loadData();
};