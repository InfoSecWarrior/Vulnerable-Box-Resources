let parsedData = [];

// Function to fetch and parse XML data from multiple URLs
async function fetchData() {
    const urlFile = 'https://raw.githubusercontent.com/infoSecWarrior/Vulnerable-Box-Resources/refs/heads/main/Raw-File-Links.txt';
    
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

// Function to render machine data in a table with optional query highlighting
function renderMachines(data, query = '') {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = ''; // Clear previous data
    const lowerQuery = query.toLowerCase(); // Lowercase the query for case-insensitive matching

    // Highlight function: wraps matching text in a <span> with a red color
    const highlight = (text, query) => {
        if (!query) return text; // No query means no highlighting

        const regex = new RegExp(`(${query})`, 'gi'); // Create a regex for the query
        return text.replace(regex, '<span style="color: red;">$1</span>'); // Replace and wrap in <span>
    };

    data.forEach(item => {
        const row = document.createElement('tr');

        // Highlight machine name, port details, service names, and products based on the search query
        const machineNameLink = `<a href="machine.html?dir=${(item.machineDir)}&file=${item.machineFile}" target="_blank">${highlight(item.machineName, lowerQuery)}</a>`;

        const portDetails = item.portDetails
            .split(', ')
            .map(port => `<span class="port-entry">${highlight(port, lowerQuery)}</span>`)
            .join(''); // Highlight each port if it matches

        const serviceNames = item.serviceDetails
            .map(service => `<span class="service-entry">${highlight(service.serviceName, lowerQuery)}</span>`)
            .join('');

        const serviceProducts = item.serviceDetails
            .map(service => `<span class="product-version-entry">${highlight(service.serviceProduct, lowerQuery)} ${highlight(service.serviceVersion, lowerQuery)}</span>`)
            .join('');

        // Construct table row with the highlighted content
        row.innerHTML = `
            <td>${machineNameLink}</td>
            <td>${portDetails}</td>
            <td>${serviceNames}</td>
            <td>${serviceProducts}</td>
        `;

        tableBody.appendChild(row);
    });
}

// Fetch data and render on page load
window.onload = fetchData;

// Function to filter data based on search query
document.getElementById('searchBar').addEventListener('input', function () {
    const query = this.value.toLowerCase().trim();

    const patterns = {
        machine: /machine:([a-zA-Z0-9-_]+)/i,
        port: /port:(\d+)/i,
        service: /service:([a-zA-Z0-9-_]+)/i,
        product: /product:([a-zA-Z0-9-_]+)/i,
        version: /version:([a-zA-Z0-9._-]+)/i
    };

    let filteredData = parsedData;

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
