let table = document.getElementById("tableBody");

function loadData() {
  db.collection("equipment").get().then(snapshot => {

    table.innerHTML = "";
    let i = 1;

    snapshot.forEach(doc => {
      let item = doc.data();

      let row =
        "<tr>" +
        "<td>" + i++ + "</td>" +
        "<td>" + item.tag + "</td>" +
        "<td>" + item.desc + "</td>" +
        "<td>" + item.serial + "</td>" +
        "<td>" + item.cal + "</td>" +
        "<td>" + item.qty + "</td>" +
        "<td>" + item.price + "</td>" +
        "<td>" + item.date + "</td>" +
        "<td>-</td>" +
        "</tr>";

      table.innerHTML += row;
    });

  });
}

function addEquipment() {

  let newItem = {
    tag: document.getElementById("tag").value,
    desc: document.getElementById("desc").value,
    serial: document.getElementById("serial").value,
    cal: document.getElementById("cal").value,
    qty: document.getElementById("qty").value,
    price: document.getElementById("price").value,
    date: document.getElementById("date").value
  };

  db.collection("equipment").add(newItem).then(() => {

    document.getElementById("tag").value = "";
    document.getElementById("desc").value = "";
    document.getElementById("serial").value = "";
    document.getElementById("cal").value = "";
    document.getElementById("qty").value = "";
    document.getElementById("price").value = "";
    document.getElementById("date").value = "";

    loadData();
  });
}

function searchTable() {
  let input = document.getElementById("search").value.toLowerCase();
  let rows = document.querySelectorAll("#tableBody tr");

  rows.forEach(row => {
    let text = row.innerText.toLowerCase();
    row.style.display = text.includes(input) ? "" : "none";
  });
}

window.onload = function () {
  loadData();
};