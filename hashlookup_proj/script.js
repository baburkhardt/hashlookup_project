let db;
let dbReady = false;

const request = indexedDB.open("HashDatabase", 1);
request.onupgradeneeded = function(event) {
    db = event.target.result;
    db.createObjectStore("hashes", { keyPath: "word" });
};
request.onsuccess = function(event) {
    db = event.target.result;
    dbReady = true;
    console.log("Database initialized successfully.");
};
request.onerror = function(event) {
    console.error("IndexedDB error:", event.target.error);
};

function generateHashes() {
    if (!dbReady) {
        console.error("Database is not initialized or is closing.");
        return;
    }

    const textArea = document.getElementById("inputText").value;
    const words = textArea.match(/\S+/g) || []; 
    const tableBody = document.querySelector("#hashTable tbody");
    tableBody.innerHTML = "";

    const transaction = db.transaction(["hashes"], "readwrite");
    const store = transaction.objectStore("hashes");

    transaction.onerror = function(event) {
        console.error("Transaction failed:", event.target.error);
    };

    words.forEach(word => {
        const md5 = CryptoJS.MD5(word).toString();
        const sha1 = CryptoJS.SHA1(word).toString();
        const sha256 = CryptoJS.SHA256(word).toString();

        store.put({ word, md5, sha1, sha256 });

        const row = tableBody.insertRow();
        row.insertCell(0).innerText = word;
        row.insertCell(1).innerText = md5;
        row.insertCell(2).innerText = sha1;
        row.insertCell(3).innerText = sha256;
    });

    transaction.oncomplete = function() {
        console.log("Transaction completed successfully.");
    };
}

function searchHash() {
    if (!dbReady) {
        console.error("Database is not initialized or is closing.");
        return;
    }

    const inputHash = document.getElementById("searchHash").value.trim();
    const transaction = db.transaction(["hashes"], "readonly");
    const store = transaction.objectStore("hashes");
    const cursorRequest = store.openCursor();
    let result = "No match found.";

    cursorRequest.onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            if (Object.values(cursor.value).includes(inputHash)) {
                result = `Word found: ${cursor.value.word}`;
            } else {
                cursor.continue();
            }
        }
        document.getElementById("searchResult").innerText = result;
    };
}

function showSearchOverlay() {
    document.getElementById("searchOverlay").style.display = "flex";
}

function hideSearchOverlay() {
    document.getElementById("searchOverlay").style.display = "none";
}


function startSearch() {
    const hashInput = document.getElementById("searchHash").value.trim();
    if (!hashInput) {
        alert("Please enter a hash value to search.");
        return;
    }
    console.log(`Starting search for hash: ${hashInput}`);
	showSearchOverlay(); // Show progress overlay
    searchHashSequentiallyGitHub(hashInput, 0); // Pass the retrieved hash value
}
/*
async function searchHashSequentially(hash, datasetIndex = 0) {
    const transaction = db.transaction(["hashes"], "readonly");
    const store = transaction.objectStore("hashes");
    const cursorRequest = store.openCursor();
    let result = "No match found.";

    cursorRequest.onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            if (Object.values(cursor.value).includes(hash)) {
                result = `Word found: ${cursor.value.word}`;
                document.getElementById("searchResult").innerText = result;
                return; // Stop further searching
            } else {
                cursor.continue();
            }
        } else {
            // Hash not found, load the next dataset and retry search
            datasetIndex++;
            const nextFile = `data.${datasetIndex}.json`; // Assuming files are named data.1.json, data.2.json, etc.

            fetch(nextFile)
                .then(response => response.json())
                .then(newData => {
                    if (newData.length > 0) {
                        clearIndexedDB(() => {
                            loadDatasetIntoIndexedDB(newData, () => {
                                searchHashSequentially(hash, datasetIndex);
                            });
                        });
                    } else {
                        document.getElementById("searchResult").innerText = "Hash not found in any dataset.";
                    }
                })
                .catch(() => document.getElementById("searchResult").innerText = "No more datasets available.");
        }
    };
}
*/
async function searchHashSequentiallyGitHub(hash, datasetIndex = 0) {
	console.log(`Searching for hash: ${hash} in dataset ${datasetIndex}`);
    const transaction = db.transaction(["hashes"], "readonly");
    const store = transaction.objectStore("hashes");
    const cursorRequest = store.openCursor();
    let result = "No match found.";

    cursorRequest.onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
			//console.warn(`Hash ${hash} not found in dataset ${datasetIndex}, loading next...`);
			//console.log(`Checking word: ${cursor.value.word}`);
            if (Object.values(cursor.value).includes(hash)) {
                console.log(`Match found: ${cursor.value.word}`);
                document.getElementById("searchResult").innerText = `Word found: ${cursor.value.word}`;
                hideSearchOverlay(); // Hide overlay when search is complete
                return;
            } else {
                cursor.continue();
            }
        } else {
            // Hash not found, load next dataset from GitHub
            datasetIndex++;
			
            let githubRawURL = `https://baburkhardt.github.io/hashlookup_project/data.${datasetIndex}.json`;
			console.log("Requesting Data...",githubRawURL);
            fetch(githubRawURL)
                .then(response => {
                    if (!response.ok) throw new Error("File not found or inaccessible.");
                    return response.json();
                })
                .then(newData => {
                    if (newData.length > 0) {
                        clearIndexedDB(() => {
                            loadDatasetIntoIndexedDB(newData, () => {
                                searchHashSequentiallyGitHub(hash, datasetIndex);
                            });
                        });
                    } else {
                        document.getElementById("searchResult").innerText = "Hash not found in any dataset.";
						hideSearchOverlay(); // Hide overlay when search completes with no results
                    }
                })
                .catch(() => {
					document.getElementById("searchResult").innerText = "No more datasets available.";
					hideSearchOverlay(); // Hide overlay when search completes with no results
				})
        }
    };
}

function clearIndexedDB(callback) {
    const transaction = db.transaction(["hashes"], "readwrite");
    const store = transaction.objectStore("hashes");
    const clearRequest = store.clear();

    clearRequest.onsuccess = function() {
        console.log("IndexedDB cleared.");
        callback();
    };
}
/*
function loadDatasetIntoIndexedDB(dataset, callback) {
    const transaction = db.transaction(["hashes"], "readwrite");
    const store = transaction.objectStore("hashes");

    dataset.forEach(entry => store.put(entry));

    transaction.oncomplete = function() {
        console.log("New dataset loaded into IndexedDB.");
        callback();
    };
}
*/

function loadDatasetIntoIndexedDB(dataset, callback) {
    const transaction = db.transaction(["hashes"], "readwrite");
    const store = transaction.objectStore("hashes");

    dataset.forEach(entry => store.put(entry));

    transaction.oncomplete = function() {
        console.log("New dataset loaded into IndexedDB.");
        
        // Debug: Check all stored values
        const readTransaction = db.transaction(["hashes"], "readonly");
        const readStore = readTransaction.objectStore("hashes");
        const getAllRequest = readStore.getAll();

        getAllRequest.onsuccess = function() {
            console.log("IndexedDB contents:", getAllRequest.result);
        };

        callback();
    };
}

function backupData() {
    if (!db) {
        console.error("Database is not initialized.");
        alert("Database connection is not available.");
        return;
    }

    const transaction = db.transaction(["hashes"], "readonly");
    const store = transaction.objectStore("hashes");
    const request = store.getAll();

    request.onsuccess = function() {
        if (!request.result || request.result.length === 0) {
            console.warn("No data available for export.");
            alert("The database is empty. Nothing to export.");
            return;
        }

        console.log("Retrieved data:", request.result);

        const jsonData = JSON.stringify(request.result, null, 2);
        const blob = new Blob([jsonData], { type: "application/json" });
        const blobURL = window.URL.createObjectURL(blob);

        // Ensure the blob URL is valid and triggers download
        if (!blobURL) {
            console.error("Failed to create Blob URL.");
            alert("Error creating export file.");
            return;
        }

        const a = document.createElement("a");
        a.href = blobURL;
        a.download = "backup.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Revoke the object URL after a short delay to prevent memory leaks
        setTimeout(() => URL.revokeObjectURL(blobURL), 1000);

        console.log("Backup successfully triggered for download.");
    };

    request.onerror = function(event) {
        console.error("Error exporting data:", event.target.error);
        alert("Failed to export database.");
    };
}


// Function to reopen IndexedDB if closed
function reopenDatabase(callback) {
    const newRequest = indexedDB.open("HashDatabase", 1);
    newRequest.onsuccess = function(event) {
        db = event.target.result;
        console.log("Database re-opened successfully.");
        callback();
    };
    newRequest.onerror = function(event) {
        console.error("Failed to reopen database:", event.target.error);
    };
}




function importData() {
    if (!dbReady) {
        console.error("Database is not initialized or is closing.");
        return;
    }

    const fileInput = document.getElementById("importFile").files[0];
    if (fileInput) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const newData = JSON.parse(event.target.result);
            const transaction = db.transaction(["hashes"], "readwrite");
            const store = transaction.objectStore("hashes");

            newData.forEach(entry => store.put(entry));

            alert("Database imported successfully!");
        };
        reader.readAsText(fileInput);
    }
}
