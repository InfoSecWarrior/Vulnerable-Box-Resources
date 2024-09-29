const corsProxy = 'https://cors-anywhere.herokuapp.com/';
const dataSources = {
    Vulnhub: `${corsProxy}https://raw.githubusercontent.com/infoSecWarrior/Vulnerable-Box-Resources/main/Vulnhub-Raw-File-Links.txt`,
    HTB: `${corsProxy}https://raw.githubusercontent.com/infoSecWarrior/Vulnerable-Box-Resources/main/HTB-Raw-File-Links.txt`,
    Other: `${corsProxy}https://raw.githubusercontent.com/infoSecWarrior/Vulnerable-Box-Resources/main/Other-Raw-File-Links.txt`
};

let currentPage = 1;
const resultsPerPage = 10;
let allData = [];

// Function to fetch data from sources
async function fetchData() {
    const results = [];
    for (const source in dataSources) {
        try {
            const response = await fetch(dataSources[source]);
            if (!response.ok) throw new Error(`Failed to fetch ${source}`);
            const data = await response.text();
            results.push(...data.split('\n').map(line => line.trim()).filter(line => line));
        } catch (error) {
            console.error(`Error fetching data from ${source}:`, error);
        }
    }
    return results;
}

// Function to display data in the table
function displayData(data) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = ''; // Clear previous data
    data.slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage).forEach(item => {
        const [name, ports, service, productVersion] = item.split('|'); // Assuming data is pipe-separated
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${name || 'N/A'}</td>
            <td>${ports || 'N/A'}</td>
            <td>${service || 'N/A'}</td>
            <td>${productVersion || 'N/A'}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Function to update pagination info
function updatePagination() {
    const totalResults = allData.length;
    const totalCount = document.getElementById('totalCount');
    totalCount.textContent = `Total Results: ${totalResults}`;

    const pageInfo = document.getElementById('pageInfo');
    pageInfo.textContent = `Page ${currentPage} of ${Math.ceil(totalResults / resultsPerPage)}`;

    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage * resultsPerPage >= totalResults;
}

// Event Listeners for Pagination
document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayData(allData);
        updatePagination();
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentPage * resultsPerPage < allData.length) {
        currentPage++;
        displayData(allData);
        updatePagination();
    }
});

// Search functionality
document.getElementById('searchBar').addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const filteredData = allData.filter(item => item.toLowerCase().includes(searchTerm));
    displayData(filteredData);
    updatePagination();
});

// Fetch and display data on load
(async function init() {
    document.getElementById('status').textContent = 'Loading...';
    allData = await fetchData();
    displayData(allData);
    updatePagination();
    document.getElementById('status').textContent = 'Data Loaded';
})();
