let parsedData = [];
let cachedFilteredData = [];
let currentPage = 1;
const itemsPerPage = 20;

const dataSources = {
    Vulnhub: 'https://raw.githubusercontent.com/riteshs4hu/Vulnerable-Box-Resources/main/Vulnhub-Raw-File-Links.txt',
    HTB: 'https://raw.githubusercontent.com/riteshs4hu/Vulnerable-Box-Resources/main/HTB-Raw-File-Links.txt',
    Other: 'https://raw.githubusercontent.com/riteshs4hu/Vulnerable-Box-Resources/main/Other-Raw-File-Links.txt'
};

async function fetchAllData() {
    console.log('Starting to fetch all data from sources...');
    updateStatus('Loading data from all sources...');
    parsedData = [];
    cachedFilteredData = [];
    currentPage = 1;

    const fetchPromises = Object.keys(dataSources).map(dataSource => fetchData(dataSource));

    try {
        await Promise.all(fetchPromises);
        updateStatus('Data loaded from all available sources.');
        console.log('Data loading completed successfully. Total records:', parsedData.length);
        renderPage(currentPage, parsedData); // Initial render of all data
    } catch (error) {
        console.error('Error loading data from some sources:', error);
        updateStatus('Data loading completed with errors.');
    }
}

async function fetchData(dataSource) {
    const urlFile = dataSources[dataSource];
    updateStatus(`Loading from ${dataSource}...`);

    try {
        const response = await fetch(urlFile);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const urlText = await response.text();
        const urls = urlText.trim().split(/\r?\n/);

        // Remove duplicates
        const uniqueUrls = urls.filter(url => !parsedData.some(data => data.machineFile === url));

        // Fetch XML files with concurrency limit
        const concurrencyLimit = 5;
        for (let i = 0; i < uniqueUrls.length; i += concurrencyLimit) {
            const batch = uniqueUrls.slice(i, i + concurrencyLimit);
            await Promise.all(batch.map(url => fetchAndParseXML(url, dataSource)));
        }

        updateStatus(`Data loaded from ${dataSource}.`);
    } catch (error) {
        console.error(`Error fetching URL file ${urlFile}:`, error);
        updateStatus(`Error loading data from ${dataSource}.`);
    }
}

async function fetchAndParseXML(url, dataSource) {
    try {
        const xmlResponse = await fetch(url);
        if (!xmlResponse.ok) {
            console.warn(`Skipping ${url} due to HTTP error! Status: ${xmlResponse.status}`);
            return;
        }

        const xmlText = await xmlResponse.text();
        parseXML(xmlText, url, dataSource);
    } catch (error) {
        console.error(`Error fetching XML from ${url} in ${dataSource}:`, error);
    }
}

function parseXML(xmlText, url, platform) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        const urlSegments = url.split('/');
        const encodedDirectoryName = urlSegments[urlSegments.length - 2];
        const directoryName = decodeURIComponent(encodedDirectoryName);

        console.log('Original Directory Name:', directoryName);

        const modifiedDirectoryName = directoryName.replace(/-/g, ' ');
        console.log('Modified Directory Name:', modifiedDirectoryName);

        const fullFileName = urlSegments[urlSegments.length - 1];
        const fileBase = fullFileName.replace('-nmap-version-scan-output.xml', '');

        const hosts = xmlDoc.querySelectorAll('host');

        hosts.forEach(host => {
            const ports = host.querySelectorAll('port');
            const portDetails = Array.from(ports).map(port => {
                const portId = port.getAttribute('portid');
                const protocol = port.getAttribute('protocol');
                return `${portId}/${protocol}`;
            }).join(', ');

            const serviceDetails = Array.from(host.querySelectorAll('service')).map(service => ({
                serviceName: service.getAttribute('name') || 'Unknown',
                serviceProduct: service.getAttribute('product') || 'Unknown',
                serviceVersion: service.getAttribute('version') || 'Unknown'
            }));

            const machineFileName = fullFileName.replace(/\.xml$/, '.nmap');
            if (!parsedData.some(data => data.machineFile === machineFileName)) {
                parsedData.push({
                    machineName: modifiedDirectoryName,
                    portDetails,
                    serviceDetails,
                    machineDir: encodedDirectoryName,
                    machineFile: machineFileName,
                    fileBaseName: fileBase,
                    platform
                });
            }
        });
    } catch (error) {
        console.error('Error parsing XML:', error);
    }
}

// Helper function to update status text
function updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Function to render the current page of data
function renderPage(page, data, query = '') {
    console.log(`Rendering page ${page} with query: "${query}"`);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    renderMachines(paginatedData, query);
    updatePaginationControls(page, data.length);
    const totalCountElement = document.getElementById('totalCount');
    const searchCountElement = document.getElementById('searchCount');
    if (query === '') {
        // When no search query is provided, show total vulnerable machine count
        if (totalCountElement) {
            totalCountElement.textContent = `Total Vulnerable Machines: ${parsedData.length}`;
        }
        // Hide the search result count
        searchCountElement.style.display = 'none';
    } else {
        // When a search query is provided, show search results count
        if (searchCountElement) {
            searchCountElement.textContent = `Search Results: ${data.length}`;
            searchCountElement.style.display = 'block';
        }
        // Hide the total count when search results are being displayed
        totalCountElement.style.display = 'none';
    }
}

// Function to update pagination controls
function updatePaginationControls(page, totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const pageInfoElement = document.getElementById('pageInfo');
    if (pageInfoElement) {
        pageInfoElement.textContent = `Page ${page} of ${totalPages}`;
    }

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) prevBtn.disabled = page === 1;
    if (nextBtn) nextBtn.disabled = page === totalPages;

    console.log(`Updated pagination: Page ${page} of ${totalPages}`);
}

function renderMachines(data, query = '') {
    const tableBody = document.getElementById('table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const lowerQuery = query.toLowerCase();

    const escapeHTML = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    const highlight = (text, query) => {
        if (!query) return escapeHTML(text);
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        return escapeHTML(text).replace(regex, '<span style="color: red;">$1</span>');
    };

    data.forEach(item => {
        const row = document.createElement('tr');

        // Machine name link with platform tag after it
        const machineNameLink = `<a href="machine.html?dir=${encodeURIComponent(item.machineDir)}&file=${encodeURIComponent(item.machineFile)}">
            ${highlight(item.machineName, lowerQuery)}
            <span class="platform-tag">${item.platform}</span> <!-- Platform tag added here -->
        </a>`;

        const portDetails = item.portDetails
            .split(', ')
            .map(port => `<span class="port-entry">${highlight(port, lowerQuery)}</span>`)
            .join('');

        const serviceNames = item.serviceDetails
            .map(service => `<span class="service-entry">${highlight(service.serviceName, lowerQuery)}</span>`)
            .join('');

        const serviceProducts = item.serviceDetails
            .map(service => `<span class="product-version-entry">${highlight(service.serviceProduct, lowerQuery)} ${highlight(service.serviceVersion, lowerQuery)}</span>`)
            .join('');

        row.innerHTML = `
            <td>${machineNameLink}</td>
            <td>${portDetails}</td>
            <td>${serviceNames}</td>
            <td>${serviceProducts}</td>
        `;

        tableBody.appendChild(row);
    });

    if (data.length === 0) {
        const noDataRow = document.createElement('tr');
        noDataRow.innerHTML = '<td colspan="4">No results found.</td>';
        tableBody.appendChild(noDataRow);
    }

    console.log(`Rendered ${data.length} machine entries.`);
}





// Escape RegExp special characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Pagination button event listeners
document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        const dataToRender = cachedFilteredData.length > 0 ? cachedFilteredData : parsedData;
        renderPage(currentPage, dataToRender, document.getElementById('searchBar').value);
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    const dataLength = cachedFilteredData.length > 0 ? cachedFilteredData.length : parsedData.length;
    const totalPages = Math.ceil(dataLength / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        const dataToRender = cachedFilteredData.length > 0 ? cachedFilteredData : parsedData;
        renderPage(currentPage, dataToRender, document.getElementById('searchBar').value);
    }
});

// Fetch data on page load
window.addEventListener('DOMContentLoaded', fetchAllData);

// Debounced search handler
let debounceTimeout;
document.getElementById('searchBar').addEventListener('input', function () {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        handleSearch(this.value);
    }, 300);
});

function handleSearch(query) {
    const trimmedQuery = query.toLowerCase().trim();
    let filteredData = parsedData;

    if (trimmedQuery === '') {
        cachedFilteredData = [];
        currentPage = 1;
        renderPage(currentPage, parsedData);
        updateSearchResultCount(0); // Reset search result count when search is cleared
        return;
    }

    const patterns = {
        machine: /machine:([a-zA-Z0-9-_]+)/i,
        port: /port:(\d+)/i,
        service: /service:([a-zA-Z0-9-_]+)/i,
        product: /product:([a-zA-Z0-9-_]+)/i,
        version: /version:([a-zA-Z0-9._-]+)/i,
        platform: /platform:(vulnhub|htb|other)/i
    };

    let hasFilters = false;

    Object.entries(patterns).forEach(([key, regex]) => {
        const match = trimmedQuery.match(regex);
        if (match) {
            hasFilters = true;
            filteredData = filteredData.filter(item => {
                switch (key) {
                    case 'platform':
                        return item.platform.toLowerCase() === match[1].toLowerCase();
                    case 'machine':
                        return item.machineName.toLowerCase().includes(match[1].toLowerCase());
                    case 'port':
                        return item.portDetails.includes(match[1]);
                    case 'service':
                        return item.serviceDetails.some(service => service.serviceName.toLowerCase().includes(match[1].toLowerCase()));
                    case 'product':
                        return item.serviceDetails.some(service => service.serviceProduct.toLowerCase().includes(match[1].toLowerCase()));
                    case 'version':
                        return item.serviceDetails.some(service => service.serviceVersion.toLowerCase().includes(match[1].toLowerCase()));
                    default:
                        return true;
                }
            });
        }
    });

    if (!hasFilters) {
        filteredData = parsedData.filter(item =>
            item.machineName.toLowerCase().includes(trimmedQuery) ||
            item.portDetails.includes(trimmedQuery) ||
            item.serviceDetails.some(service =>
                service.serviceName.toLowerCase().includes(trimmedQuery) ||
                service.serviceProduct.toLowerCase().includes(trimmedQuery) ||
                service.serviceVersion.toLowerCase().includes(trimmedQuery)
            )
        );
    }

    cachedFilteredData = filteredData;
    currentPage = 1;
    renderPage(currentPage, cachedFilteredData, trimmedQuery);
    updateSearchResultCount(filteredData.length); // Update search result count after filtering
}

// Function to update the search result count
function updateSearchResultCount(count) {
    const searchResultCountElement = document.getElementById('searchResultCount');
    if (count > 0) {
        searchResultCountElement.style.display = 'block';
        searchResultCountElement.textContent = `Search Result: ${count}`;
    } else {
        searchResultCountElement.style.display = 'none';
    }
}

// Add event listeners to predefined pattern buttons
document.querySelectorAll('.predefined-patterns button').forEach(button => {
    button.addEventListener('click', function () {
        const pattern = this.getAttribute('data-pattern');
        const searchBar = document.getElementById('searchBar');
        searchBar.value = pattern;
        searchBar.dispatchEvent(new Event('input'));
    });
});
