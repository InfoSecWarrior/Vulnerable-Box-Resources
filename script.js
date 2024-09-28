let parsedData = [];
let currentPage = 1;
const itemsPerPage = 20;

// Function to fetch and parse XML data from multiple URLs
async function fetchData() {
    const urlFile = 'https://raw.githubusercontent.com/riteshs4hu/Vulnerable-Box-Resources/refs/heads/main/Vulnhub-Raw-File-Links.txt';
    
    document.getElementById('status').textContent = 'Loading...';
    parsedData = [];

    try {
        // Fetch the URL list from the external file
        const response = await fetch(urlFile);
        const urlText = await response.text();
        
        // Split the file content by newlines to get individual URLs
        const urls = urlText.trim().split(/\r?\n/);
        
        // Fetch and parse the XML for each URL
        for (const url of urls) {
            try {
                const xmlResponse = await fetch(url);
                const xmlText = await xmlResponse.text();

                // Debugging: Log the fetched XML content
                console.log(`Fetched XML from ${url}:`, xmlText);

                parseXML(xmlText, url);
            } catch (error) {
                console.error(`Error fetching XML from ${url}:`, error);
            }
        }

        renderMachines(parsedData);
        document.getElementById('status').textContent = 'Data loaded.';
    } catch (error) {
        console.error('Error fetching URL file:', error);
        document.getElementById('status').textContent = 'Error loading data.';
    }
}

// Function to parse XML and extract data
function parseXML(xmlText, url) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        // Debugging: Log the parsed XML document
        console.log(`Parsed XML Document from ${url}:`, xmlDoc);

        // Extract and split the URL into components
        const urlSegments = url.split('/');
        const encodedDirectoryName = urlSegments[urlSegments.length - 2];  // Second last segment (encoded directory)
        const directoryName = decodeURIComponent(encodedDirectoryName);     // Decode the directory name

        const fullFileName = urlSegments[urlSegments.length - 1]; // Full filename with extension
        const fileBase = fullFileName.replace('-nmap-version-scan-output.xml', ''); // File base name without '-nmap-scan.xml'

        const hosts = xmlDoc.querySelectorAll('host');

        hosts.forEach(host => {
            const ports = host.querySelectorAll('port');
            const portDetails = Array.from(ports).map(port => {
                const portId = port.getAttribute('portid');
                const protocol = port.getAttribute('protocol');
                return `${portId}/${protocol}`;
            }).join(', ');

            const services = Array.from(host.querySelectorAll('service'));
            const serviceDetails = services.map(service => {
                const serviceName = service.getAttribute('name') || 'Unknown';
                const serviceProduct = service.getAttribute('product') || 'Unknown';
                const serviceVersion = service.getAttribute('version') || 'Unknown';

                return {
                    serviceName,
                    serviceProduct,
                    serviceVersion
                };
            });

            parsedData.push({
                machineName: directoryName,  // Using the decoded directory name as machine name
                portDetails,
                serviceDetails,
                machineDir: encodedDirectoryName, // For URL construction
                machineFile: fullFileName.replace(/\.xml$/, '.nmap'), // Replace .xml with .nmap
                fileBaseName: fileBase // File base without '-nmap-scan.xml'
            });
        });
    } catch (error) {
        console.error('Error parsing XML:', error);
    }
}

// Function to render the current page of data
function renderPage(page, data, query = '') {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    renderMachines(paginatedData, query);
    updatePaginationControls(page, data.length);
}

// Function to update pagination controls
function updatePaginationControls(page, totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    document.getElementById('pageInfo').textContent = `Page ${page} of ${totalPages}`;

    document.getElementById('prevBtn').disabled = page === 1;
    document.getElementById('nextBtn').disabled = page === totalPages;
}

// Add event listeners to pagination buttons
document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage, parsedData, document.getElementById('searchBar').value);
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    const totalPages = Math.ceil(parsedData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage, parsedData, document.getElementById('searchBar').value);
    }
});

// Function to render machines and apply pagination
function renderMachines(data, query = '') {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = ''; // Clear previous data
    const lowerQuery = query.toLowerCase(); // Lowercase the query for case-insensitive matching

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
}

// Fetch data and render the first page on page load
window.onload = async () => {
    await fetchData();
    renderPage(currentPage, parsedData);
};

// Search bar event listener
// Search bar event listener
document.getElementById('searchBar').addEventListener('input', function () {
    const query = this.value.toLowerCase().trim();
    let filteredData = parsedData;  // Declare filteredData only once

    const patterns = {
        machine: /machine:([a-zA-Z0-9-_]+)/i,
        port: /port:(\d+)/i,
        service: /service:([a-zA-Z0-9-_]+)/i,
        product: /product:([a-zA-Z0-9-_]+)/i,
        version: /version:([a-zA-Z0-9._-]+)/i
    };

    // Filter based on predefined patterns
    Object.entries(patterns).forEach(([key, regex]) => {
        const match = query.match(regex);
        if (match) {
            filteredData = filteredData.filter(item => {
                switch (key) {
                    case 'port':
                        return item.portDetails.toLowerCase().includes(match[1].toLowerCase());
                    case 'service':
                        return item.serviceDetails.some(service => service.serviceName.toLowerCase().includes(match[1].toLowerCase()));
                    case 'product':
                        return item.serviceDetails.some(service => service.serviceProduct.toLowerCase().includes(match[1].toLowerCase()));
                    case 'version':
                        return item.serviceDetails.some(service => service.serviceVersion.toLowerCase().includes(match[1].toLowerCase()));
                    case 'machine':
                        return item.machineName.toLowerCase().includes(match[1].toLowerCase());
                    default:
                        return false;
                }
            });
        }
    });

    // Fallback to general search across all fields
    if (!Object.values(patterns).some(regex => regex.test(query)) && query) {
        filteredData = parsedData.filter(item =>
            item.machineName.toLowerCase().includes(query) ||
            item.portDetails.toLowerCase().includes(query) ||
            item.serviceDetails.some(service =>
                service.serviceName.toLowerCase().includes(query) ||
                service.serviceProduct.toLowerCase().includes(query) ||
                service.serviceVersion.toLowerCase().includes(query)
            )
        );
    }

    renderMachines(filteredData, query); // Pass the query for highlighting
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
