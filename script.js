let parsedData = [];
let cachedFilteredData = [];
let currentPage = 1;
const itemsPerPage = 20;


const dataSources = {
    Vulnhub: 'https://raw.githubusercontent.com/InfoSecWarrior/Vulnerable-Box-Resources/refs/heads/main/Vulnhub-Raw-File-Links.txt',
    Infosecwarrior: 'https://raw.githubusercontent.com/InfoSecWarrior/Vulnerable-Box-Resources/refs/heads/main/Infosecwarrior-Raw-File-Links.txt',
    "Hack-The-Box": 'https://raw.githubusercontent.com/InfoSecWarrior/Vulnerable-Box-Resources/refs/heads/main/HTB-Raw-File-Links.txt',
    Other: 'https://raw.githubusercontent.com/InfoSecWarrior/Vulnerable-Box-Resources/refs/heads/main/Other-Raw-Files-Links.txt'
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
        
        // Update the total machine count
        updateTotalMachinesCount(); 
        
        renderPage(currentPage, parsedData); // Initial render of all data
    } catch (error) {
        console.error('Error loading data from some sources:', error);
        updateStatus('Data loading completed.');
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

        // Remove concurrency limit or increase it
        const fetchPromises = uniqueUrls.map(url => fetchAndParseXML(url, dataSource));
        await Promise.all(fetchPromises);

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
        const modifiedDirectoryName = directoryName.replace(/-/g, ' ');
        const fullFileName = urlSegments[urlSegments.length - 1];
        const fileBase = fullFileName.replace('-nmap-version-scan-output.xml', '');
        let normalizedPlatform;
        if (platform === "Hack-The-Box") {
            normalizedPlatform = "htb";
        } else if (platform.toLowerCase() === "vulnhub") {
            normalizedPlatform = "Vulnhub";
        } else {
            normalizedPlatform = platform;
        }
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
                    platform: normalizedPlatform // Store corrected platform
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

function renderPage(page, data, query = '') {
    console.log(`Rendering page ${page} with query: "${query}"`);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    renderMachines(paginatedData, query);
    updatePaginationControls(page, data.length);

    const totalCountElement = document.getElementById('totalCount');
    
    if (totalCountElement) {
        if (query === '') {
            // Show total results when there's no search query
            totalCountElement.textContent = `Search Results: 0`;
        } else {
            // Show filtered result count during search
            totalCountElement.textContent = `Search Results: ${data.length}`;
        }
    }
}

function updatePaginationControls(page, totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Enable or disable prev/next buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === totalPages;

    // Update the "Back" and "Next" button text and click events
    prevBtn.innerHTML = '&lsaquo; Back';
    nextBtn.innerHTML = 'Next &rsaquo;';
    
    prevBtn.addEventListener('click', () => {
        if (page > 1) {
            currentPage = page - 1;
            renderPage(currentPage, cachedFilteredData.length > 0 ? cachedFilteredData : parsedData);
            window.scrollTo({ top: 0 });
        }
    });

    nextBtn.addEventListener('click', () => {
        if (page < totalPages) {
            currentPage = page + 1;
            renderPage(currentPage, cachedFilteredData.length > 0 ? cachedFilteredData : parsedData);
            window.scrollTo({ top: 0 });
        }
    });

    // Dynamically create page numbers with ellipsis
    const paginationPages = document.querySelector('.pagination-pages');
    paginationPages.innerHTML = ''; // Clear previous pagination

    const maxVisiblePages = 7; // Limit visible pages
    const pagesToShow = [];

    // Always show the first page
    pagesToShow.push(1);

    // Determine if ellipsis is needed before current page set
    if (page > maxVisiblePages - 3) {
        pagesToShow.push('...');
    }

    // Show pages around the current page
    const startPage = Math.max(2, page - 2); // Show up to 2 pages before the current page
    const endPage = Math.min(page + 2, totalPages - 1); // Show up to 2 pages after the current page

    for (let i = startPage; i <= endPage; i++) {
        if (i > 1 && i < totalPages) {
            pagesToShow.push(i);
        }
    }

    // Determine if ellipsis is needed before the last page
    if (page < totalPages - 3) {
        pagesToShow.push('...');
    }

    // Always show the last page
    if (totalPages > 1) {
        pagesToShow.push(totalPages);
    }

    // Create page buttons dynamically
    pagesToShow.forEach(pageNumber => {
        if (pageNumber === '...') {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            paginationPages.appendChild(ellipsis);
        } else {
            const pageButton = document.createElement('button');
            pageButton.classList.add('page-number');
            pageButton.textContent = pageNumber;

            // Highlight the active page
            if (pageNumber === page) {
                pageButton.classList.add('active');
            }

            // Add click event to load the selected page
            pageButton.addEventListener('click', () => {
                currentPage = pageNumber;
                renderPage(currentPage, cachedFilteredData.length > 0 ? cachedFilteredData : parsedData);
                window.scrollTo({ top: 0 });
            });

            paginationPages.appendChild(pageButton);
        }
    });

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
        
        // Determine the appropriate platform class based on item.platform
        let platformClass = '';
        switch (item.platform.toLowerCase()) {
            case 'vulnhub':
                platformClass = 'vulnhub-tag';
                break;
            case 'htb':
            case 'hack-the-box':
                platformClass = 'hack-the-box-tag';
                break;
            case 'infosecwarrior':
                platformClass = 'infosecwarrior-tag';
                break;
            default:
                platformClass = 'other-tag';
        }

        // Convert platform value for URL
        const platformForURL = item.platform === 'htb' ? 'Hack-The-Box' : item.platform;

        // Machine name link
        const machineNameLink = `<a href="machine.html?dir=${encodeURIComponent(item.machineDir)}&file=${encodeURIComponent(item.machineFile)}&platform=${encodeURIComponent(platformForURL)}" class="machine-name">
            ${highlight(item.machineName, lowerQuery)}
        </a>`;

	const platformTag = `<span class="platform-tag ${platformClass}" data-platform="${item.platform}">${item.platform === 'htb' ? 'Hack-The-Box' : item.platform}</span>`;

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
            <td>${machineNameLink} ${platformTag}</td>
            <td>${portDetails}</td>
            <td>${serviceNames}</td>
            <td>${serviceProducts}</td>
        `;

        tableBody.appendChild(row);
    });

    // Add event listener for platform tag search
    document.querySelectorAll('.platform-tag').forEach(tag => {
        tag.addEventListener('click', function () {
            const platform = this.getAttribute('data-platform').toLowerCase();
            document.getElementById('searchBar').value = `platform:${platform}`;
            handleSearch(`platform:${platform}`);

            window.scrollTo({
                top: 0
            });
        });
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
        window.scrollTo({
            top: 0
        });
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    const dataLength = cachedFilteredData.length > 0 ? cachedFilteredData.length : parsedData.length;
    const totalPages = Math.ceil(dataLength / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        const dataToRender = cachedFilteredData.length > 0 ? cachedFilteredData : parsedData;
        renderPage(currentPage, dataToRender, document.getElementById('searchBar').value);
        window.scrollTo({
            top: 0,

        });
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
        return;
    }

    const patterns = {
        machine: /machine:([a-zA-Z0-9-_]+)/i,
        port: /port:(\d+)/i,
        service: /service:([a-zA-Z0-9-_]+)/i,
        product: /product:([a-zA-Z0-9-_]+)/i,
        version: /version:([a-zA-Z0-9._-]+)/i,
        platform: /platform:(vulnhub|htb|other|infosecwarrior)/i
    };

    let hasFilters = false;

    Object.entries(patterns).forEach(([key, regex]) => {
        const match = trimmedQuery.match(regex);
        if (match) {
            hasFilters = true;
            filteredData = filteredData.filter(item => {
                switch (key) {
                    case 'platform':
                        const normalizedPlatform = match[1] === 'htb' ? 'htb' : match[1];
                        return item.platform.toLowerCase() === normalizedPlatform;
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

function updateTotalMachinesCount() {
    const totalMachinesElement = document.getElementById('totalMachines');
    if (totalMachinesElement) {
        totalMachinesElement.textContent = `Total Vulnerable Machines: ${parsedData.length}`;
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
