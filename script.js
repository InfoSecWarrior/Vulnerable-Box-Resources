let parsedData = [];
let cachedFilteredData = []; 
let currentPage = 1;
const itemsPerPage = 20;

const dataSources = {
    Vulnhub: 'https://raw.githubusercontent.com/riteshs4hu/Vulnerable-Box-Resources/refs/heads/main/Vulnhub-Raw-File-Links.txt',
    HTB: 'https://raw.githubusercontent.com/riteshs4hu/Vulnerable-Box-Resources/refs/heads/main/HTB-Raw-File-Links.txt',
    Other: 'https://raw.githubusercontent.com/riteshs4hu/Vulnerable-Box-Resources/refs/heads/main/Other-Raw-File-Links.txt'
};

async function fetchAllData() {
    console.log('Starting to fetch all data from sources...');
    document.getElementById('status').textContent = 'Loading data from all sources...';
    parsedData = []; 
    cachedFilteredData = [];  
    currentPage = 1;

    const fetchPromises = Object.keys(dataSources).map(dataSource => fetchData(dataSource));

    try {
        await Promise.all(fetchPromises);
        document.getElementById('status').textContent = 'Data loaded from all available sources.';
        console.log('Data loading completed successfully. Total records:', parsedData.length);
        renderPage(currentPage, parsedData); // Initial render of all data
    } catch (error) {
        console.error('Error loading data from some sources:', error);
        document.getElementById('status').textContent = 'Data loading completed with errors.';
    }
}

async function fetchData(dataSource) {
    const urlFile = dataSources[dataSource];

    document.getElementById('status').textContent = `Loading from ${dataSource}...`;

    try {
        const response = await fetch(urlFile);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const urlText = await response.text();
        const urls = urlText.trim().split(/\r?\n/);

        for (const url of urls) {
            try {
                if (!parsedData.some(data => data.machineFile === url)) {
                    const xmlResponse = await fetch(url);
                    if (!xmlResponse.ok) {
                        console.warn(`Skipping ${url} due to HTTP error! Status: ${xmlResponse.status}`);
                        continue;
                    }

                    const xmlText = await xmlResponse.text();
                    parseXML(xmlText, url, dataSource);
                }
            } catch (error) {
                console.error(`Error fetching XML from ${url}:`, error);
            }
        }

        document.getElementById('status').textContent = `Data loaded from ${dataSource}.`;
    } catch (error) {
        console.error(`Error fetching URL file ${urlFile}:`, error);
        document.getElementById('status').textContent = `Error loading data from ${dataSource}.`;
    }
}

function parseXML(xmlText, url, platform) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        const urlSegments = url.split('/');
        const encodedDirectoryName = urlSegments[urlSegments.length - 2];
        const directoryName = decodeURIComponent(encodedDirectoryName);
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

            if (!parsedData.some(data => data.machineFile === fullFileName.replace(/\.xml$/, '.nmap'))) {
                parsedData.push({
                    machineName: directoryName,
                    portDetails,
                    serviceDetails,
                    machineDir: encodedDirectoryName,
                    machineFile: fullFileName.replace(/\.xml$/, '.nmap'),
                    fileBaseName: fileBase,
                    platform
                });
            }
        });
    } catch (error) {
        console.error('Error parsing XML:', error);
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
    document.getElementById('totalCount').textContent = `Total Results: ${data.length}`;
}

// Function to update pagination controls
function updatePaginationControls(page, totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    document.getElementById('pageInfo').textContent = `Page ${page} of ${totalPages}`;
    document.getElementById('prevBtn').disabled = page === 1;
    document.getElementById('nextBtn').disabled = page === totalPages;

    console.log(`Updated pagination: Page ${page} of ${totalPages}`);
}

// Render machines in a table
function renderMachines(data, query = '') {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';
    const lowerQuery = query.toLowerCase();

    const highlight = (text, query) => {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span style="color: red;">$1</span>');
    };

    data.forEach(item => {
        const row = document.createElement('tr');

        const machineNameLink = `<a href="machine.html?dir=${item.machineDir}&file=${item.machineFile}" target="_blank">${highlight(item.machineName, lowerQuery)}</a>`;

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

    console.log(`Rendered ${data.length} machine entries.`);
}

// Pagination button event listeners
document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        const dataToRender = cachedFilteredData.length > 0 ? cachedFilteredData : parsedData;  // Use cached data if available
        renderPage(currentPage, dataToRender, document.getElementById('searchBar').value);
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    const totalPages = Math.ceil((cachedFilteredData.length > 0 ? cachedFilteredData.length : parsedData.length) / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        const dataToRender = cachedFilteredData.length > 0 ? cachedFilteredData : parsedData;  // Use cached data if available
        renderPage(currentPage, dataToRender, document.getElementById('searchBar').value);
    }
});

// Fetch data on page load
fetchAllData();

document.getElementById('searchBar').addEventListener('input', function () {
    const query = this.value.toLowerCase().trim();
    let filteredData = parsedData; // Start with all data

    // If the query is empty, just render all data
    if (query === '') {
        cachedFilteredData = []; // Clear cached data
        currentPage = 1; // Reset to the first page
        renderPage(currentPage, parsedData); // Render all data
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

    // Check for matches with defined patterns
    let hasFilters = false; // Flag to check if any filter is applied

    Object.entries(patterns).forEach(([key, regex]) => {
        const match = query.match(regex);
        if (match) {
            hasFilters = true; // Set the filter flag
            filteredData = filteredData.filter(item => {
                switch (key) {
                    case 'platform':
                        return item.platform.toLowerCase() === match[1].toLowerCase(); // Compare platform directly
                    case 'machine':
                        return item.machineName.toLowerCase().includes(match[1].toLowerCase());
                    case 'port':
                        return item.portDetails.includes(match[1]); // Check port inclusion
                    case 'service':
                        return item.serviceDetails.some(service => service.serviceName.toLowerCase().includes(match[1].toLowerCase()));
                    case 'product':
                        return item.serviceDetails.some(service => service.serviceProduct.toLowerCase().includes(match[1].toLowerCase()));
                    case 'version':
                        return item.serviceDetails.some(service => service.serviceVersion.toLowerCase().includes(match[1].toLowerCase()));
                    default:
                        return true; // If no match, return true
                }
            });
        }
    });

    // If no specific filters were matched, filter based on the query
    if (!hasFilters) {
        filteredData = parsedData.filter(item => 
            item.machineName.toLowerCase().includes(query) || 
            item.portDetails.includes(query) ||
            item.serviceDetails.some(service => 
                service.serviceName.toLowerCase().includes(query) ||
                service.serviceProduct.toLowerCase().includes(query) ||
                service.serviceVersion.toLowerCase().includes(query)
            )
        );
    }

    cachedFilteredData = filteredData; // Store filtered data in the cache
    currentPage = 1; // Reset to the first page
    renderPage(currentPage, cachedFilteredData, query); // Render filtered results
});


// Add event listeners to predefined pattern buttons
document.querySelectorAll('.predefined-patterns button').forEach(button => {
    button.addEventListener('click', function() {
        const pattern = this.getAttribute('data-pattern');
        const searchBar = document.getElementById('searchBar');
        searchBar.value = pattern;  // Set the search input to the clicked pattern
        searchBar.dispatchEvent(new Event('input')); // Trigger the input event to filter results
    });
});
