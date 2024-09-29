// script.js

let parsedData = [];
let cachedFilteredData = [];
let currentPage = 1;
const itemsPerPage = 20;

// Define your data sources
const corsProxy = 'https://cors-anywhere.herokuapp.com/';
const dataSources = {
    Vulnhub: `${corsProxy}https://raw.githubusercontent.com/infoSecWarrior/Vulnerable-Box-Resources/main/Vulnhub-Raw-File-Links.txt`,
    HTB: `${corsProxy}https://raw.githubusercontent.com/infoSecWarrior/Vulnerable-Box-Resources/main/HTB-Raw-File-Links.txt`,
    Other: `${corsProxy}https://raw.githubusercontent.com/infoSecWarrior/Vulnerable-Box-Resources/main/Other-Raw-File-Links.txt`
};

/**
 * Initiates data fetching from all sources.
 */
async function fetchAllData() {
    console.log('Starting to fetch all data from sources...');
    updateStatus('Loading data from all sources...', true);
    parsedData = [];
    cachedFilteredData = [];
    currentPage = 1;

    const fetchPromises = Object.keys(dataSources).map(dataSource => fetchData(dataSource));

    try {
        await Promise.all(fetchPromises);
        updateStatus('Data loaded from all available sources.', false);
        console.log('Data loading completed successfully. Total records:', parsedData.length);
        updateTotalMachines(parsedData.length); // Update total machines count
        updateSearchResults(parsedData.length); // Initially, all results are shown
        renderPage(currentPage, parsedData); // Initial render of all data
    } catch (error) {
        console.error('Error loading data from some sources:', error);
        updateStatus('Data loading completed with errors.', false);
    }
}

/**
 * Fetches data from a specific data source.
 * @param {string} dataSource - The name of the data source.
 */
async function fetchData(dataSource) {
    const urlFile = dataSources[dataSource];
    updateStatus(`Loading from ${dataSource}...`, true);

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

        updateStatus(`Data loaded from ${dataSource}.`, false);
    } catch (error) {
        console.error(`Error fetching URL file ${urlFile}:`, error);
        updateStatus(`Error loading data from ${dataSource}.`, false);
    }
}

/**
 * Fetches and parses XML data from a URL.
 * @param {string} url - The URL to fetch the XML data from.
 * @param {string} dataSource - The name of the data source.
 */
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

/**
 * Parses XML data and populates the parsedData array.
 * @param {string} xmlText - The XML data as a string.
 * @param {string} url - The URL from which the XML was fetched.
 * @param {string} platform - The platform/source name.
 */
function parseXML(xmlText, url, platform) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        // Check for XML parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            console.error('Error parsing XML:', parserError.textContent);
            return;
        }

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

/**
 * Updates the status message and spinner visibility.
 * @param {string} message - The status message to display.
 * @param {boolean} isLoading - Indicates whether a loading operation is in progress.
 */
function updateStatus(message, isLoading) {
    const statusMessage = document.getElementById('statusMessage');
    const spinner = document.getElementById('spinner');
    if (statusMessage) {
        statusMessage.textContent = message;
    }
    if (spinner) {
        spinner.style.display = isLoading ? 'inline-block' : 'none';
    }
}

/**
 * Updates the total number of vulnerable machines displayed.
 * @param {number} count - The total count of vulnerable machines.
 */
function updateTotalMachines(count) {
    const totalMachinesElement = document.getElementById('totalMachines');
    if (totalMachinesElement) {
        totalMachinesElement.textContent = `Total Vulnerable Machines: ${count}`;
    }
}

/**
 * Updates the total number of search results displayed.
 * @param {number} count - The count of search results.
 */
function updateSearchResults(count) {
    const searchResultsElement = document.getElementById('searchResults');
    if (searchResultsElement) {
        searchResultsElement.textContent = `Search Results: ${count}`;
    }
}

/**
 * Renders the current page of data.
 * @param {number} page - The current page number.
 * @param {Array} data - The data to display on the current page.
 * @param {string} query - The current search query.
 */
function renderPage(page, data, query = '') {
    console.log(`Rendering page ${page} with query: "${query}"`);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    renderMachines(paginatedData, query);
    updatePaginationControls(page, data.length);
    updateSearchResults(data.length); // Update search results count
}

/**
 * Updates the pagination controls based on the current page and total items.
 * @param {number} page - The current page number.
 * @param {number} totalItems - The total number of items.
 */
function updatePaginationControls(page, totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const pageInfoElement = document.getElementById('pageInfo');
    if (pageInfoElement) {
        pageInfoElement.textContent = `Page ${page} of ${totalPages}`;
    }

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) prevBtn.disabled = page === 1;
    if (nextBtn) nextBtn.disabled = page === totalPages || totalPages === 0;

    console.log(`Updated pagination: Page ${page} of ${totalPages}`);
}

/**
 * Renders the machines data into the table.
 * @param {Array} data - The machines data to display.
 * @param {string} query - The current search query.
 */
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
        const escapedQuery = escapeRegExp(query);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return escapeHTML(text).replace(regex, '<span class="highlight">$1</span>');
    };

    data.forEach(item => {
        const row = document.createElement('tr');

        const machineNameLink = `<a href="machine.html?dir=${encodeURIComponent(item.machineDir)}&file=${encodeURIComponent(item.machineFile)}">${highlight(item.machineName, lowerQuery)}</a>`;

        const portDetails = item.portDetails
            .split(', ')
            .map(port => `<span class="port-entry">${highlight(port, lowerQuery)}</span>`)
            .join(', '); // Added comma separation for better readability

        const serviceNames = item.serviceDetails
            .map(service => `<span class="service-entry">${highlight(service.serviceName, lowerQuery)}</span>`)
            .join(', '); // Added comma separation

        const serviceProducts = item.serviceDetails
            .map(service => `<span class="product-version-entry">${highlight(service.serviceProduct, lowerQuery)} ${highlight(service.serviceVersion, lowerQuery)}</span>`)
            .join(', '); // Added comma separation

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

/**
 * Handles the search functionality with debouncing.
 * @param {string} query - The search query entered by the user.
 */
function handleSearch(query) {
    const trimmedQuery = query.toLowerCase().trim();
    let filteredData = parsedData;

    if (trimmedQuery === '') {
        cachedFilteredData = [];
        currentPage = 1;
        renderPage(currentPage, parsedData);
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
}

/**
 * Escapes special characters in a string for use in a regular expression.
 * @param {string} string - The string to escape.
 * @returns {string} - The escaped string.
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escapes HTML to prevent XSS attacks.
 * @param {string} str - The string to escape.
 * @returns {string} - The escaped HTML string.
 */
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Adds event listeners to predefined pattern buttons for quick search.
 */
document.querySelectorAll('.predefined-patterns button').forEach(button => {
    button.addEventListener('click', function() {
        const pattern = this.getAttribute('data-pattern');
        const searchBar = document.getElementById('searchBar');
        searchBar.value = pattern;
        searchBar.dispatchEvent(new Event('input'));
    });
});

/**
 * Clears the search input and resets the search results.
 */
document.getElementById('clearSearch').addEventListener('click', () => {
    const searchBar = document.getElementById('searchBar');
    searchBar.value = '';
    searchBar.dispatchEvent(new Event('input')); // Trigger the input event to reset the search
});

/**
 * Adds event listeners to pagination buttons.
 */
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

/**
 * Fetches data when the DOM content is fully loaded.
 */
window.addEventListener('DOMContentLoaded', fetchAllData);

/**
 * Implements debouncing for the search input to optimize performance.
 */
let debounceTimeout;
document.getElementById('searchBar').addEventListener('input', function () {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        handleSearch(this.value);
    }, 300);
});

/**
 * For testing purposes: Inject sample data if data fetching fails.
 */
async function injectSampleData() {
    const sampleData = [
        {
            machineName: "Sample Machine 1",
            portDetails: "22/tcp, 80/tcp, 443/tcp",
            serviceDetails: [
                { serviceName: "ssh", serviceProduct: "OpenSSH", serviceVersion: "7.4" },
                { serviceName: "http", serviceProduct: "Apache", serviceVersion: "2.4.29" },
                { serviceName: "https", serviceProduct: "Apache", serviceVersion: "2.4.29" }
            ],
            machineDir: "Sample-Machine-1",
            machineFile: "sample-machine-1.nmap",
            fileBaseName: "sample-machine-1",
            platform: "VulnHub"
        },
        {
            machineName: "Sample Machine 2",
            portDetails: "21/tcp, 23/tcp, 80/tcp",
            serviceDetails: [
                { serviceName: "ftp", serviceProduct: "vsftpd", serviceVersion: "3.0.3" },
                { serviceName: "telnet", serviceProduct: "telnetd", serviceVersion: "0.17" },
                { serviceName: "http", serviceProduct: "nginx", serviceVersion: "1.14.0" }
            ],
            machineDir: "Sample-Machine-2",
            machineFile: "sample-machine-2.nmap",
            fileBaseName: "sample-machine-2",
            platform: "HTB"
        }
    ];

    parsedData = sampleData;
    updateTotalMachines(parsedData.length);
    updateSearchResults(parsedData.length);
    renderPage(currentPage, parsedData);
    console.log("Sample data injected for testing purposes.");
}

/**
 * Override fetchAllData to inject sample data if data fetching fails.
 */
async function fetchAllDataWithSample() {
    try {
        await fetchAllData();
        if (parsedData.length === 0) {
            throw new Error("No data fetched. Injecting sample data.");
        }
    } catch (error) {
        console.warn(error.message);
        injectSampleData();
    }
}

// Replace the original fetchAllData with the enhanced version
window.removeEventListener('DOMContentLoaded', fetchAllData);
window.addEventListener('DOMContentLoaded', fetchAllDataWithSample);
