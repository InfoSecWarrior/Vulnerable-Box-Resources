// Helper function to fetch file content
async function fetchFileContent(url, elementId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`File not found or inaccessible: ${url}`);
        const data = await response.text();
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = data || 'No data available';
        } else {
            console.warn(`Element with ID '${elementId}' not found in the document.`);
        }
        return data;
    } catch (error) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `Error loading data from ${url}: ${error.message}`;
        }
        console.error(`Error loading data from ${url}:`, error);
        return null;
    }
}

// Helper function to limit concurrency of async operations
async function withConcurrencyLimit(tasks, limit) {
    const results = [];
    const executing = new Set();
    
    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        executing.add(p);
        p.finally(() => executing.delete(p));

        if (executing.size >= limit) {
            await Promise.race(executing);
        }
    }
    return Promise.all(results);
}

async function fetchMultipleFiles(fileUrls, elementId) {
    let combinedData = '';

    // Map URLs to fetch promises and process them concurrently
    const fetchTasks = fileUrls.map(async url => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`File not found: ${url}`);
            const data = await response.text();
            combinedData += data + '\n';
        } catch (error) {
            console.error(`Error loading data from ${url}:`, error);
        }
    });

    // Wait for all fetches to complete concurrently
    await Promise.all(fetchTasks);

    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = combinedData || 'No data available';
    } else {
        console.warn(`Element with ID '${elementId}' not found in the document.`);
    }

    return combinedData;
}



// Function to generate URLs based on dynamic number ranges and ports
function generateFileUrls(baseURL, dirName, baseFileName, type, ports) {
    const urls = [];
    if (!Array.isArray(ports) || ports.length === 0) {
        console.warn('No ports available for URL generation.');
        return urls;
    }
    for (const port of ports) {
        let url = `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-${type.replace('{port}', port)}`;
        urls.push(url);
    }
    return urls;
}

// Function to fetch open ports from a remote file
async function fetchOpenPorts(baseURL, dirName, baseFileName) {
    const openPortsUrl = `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-open-ports-list-output.txt`;
    const data = await fetchFileContent(openPortsUrl, 'open-ports-list-output');
    if (data) {
        try {
            const ports = data.split(',').map(port => port.trim()).filter(port => port);
            if (!ports.length) {
                console.warn('No valid ports found in the data.');
            }
            return ports;
        } catch (error) {
            console.error('Error parsing ports data:', error);
        }
    }
    return []; // Return an empty array if there's an error
}

async function fetchMachineData() {
    const urlParams = new URLSearchParams(window.location.search);
    const dirName = urlParams.get('dir');
    let fileName = urlParams.get('file');
    const platform = urlParams.get('platform'); // Get the platform tag from URL params

    if (!dirName || !fileName || !platform) {
        console.error('Directory, filename, or platform not provided.');
        return;
    }

    // Use original dirName for URLs and other logic
    const baseFileName = fileName.replace(/-nmap-version-scan-output/, '').replace(/\.[^.]+$/, '');

    // Replace dashes only when displaying the directory name
    const displayDirName = dirName.replace(/-/g, ' ');

    const machineTitleElement = document.getElementById('machine-title');
    if (machineTitleElement) {
        // Display the directory name without dashes
        machineTitleElement.textContent = decodeURIComponent(displayDirName) || 'Unknown Machine';
    } else {
        console.warn("Element with ID 'machine-title' not found in the document.");
    }

    const githubBaseURL = `https://github.com/InfoSecWarrior/Vulnerable-Box-Resources/tree/main/${encodeURIComponent(platform)}/`;
    const githubLink = document.getElementById('github-url');
    if (githubLink) {
        githubLink.href = `${githubBaseURL}${encodeURIComponent(dirName)}`; // Use original name for URL
        githubLink.textContent = `Get Complete ${decodeURIComponent(displayDirName)} Files on GitHub`; // ${decodeURIComponent(displayDirName)}
    } else {
        console.warn("Element with ID 'github-url' not found in the document.");
    }

    const baseURL = `https://raw.githubusercontent.com/InfoSecWarrior/Vulnerable-Box-Resources/main/${encodeURIComponent(platform)}/`; // Use the platform tag in the base URL
    
    // Fetch open ports
    const ports = await fetchOpenPorts(baseURL, dirName, baseFileName);
    
    const resourceUrl = `${baseURL}${encodeURIComponent(dirName)}/resource.txt`;
    const resourceLinkElement = document.getElementById('resource-url');
    
    const resourceContent = await fetchFileContent(resourceUrl, 'resource-url');
    if (resourceLinkElement && resourceContent) {
        resourceLinkElement.href = resourceContent.trim(); // Set original resource URL
        resourceLinkElement.textContent = 'Vulnerable Box Link';
    } else {
        console.warn("Element with ID 'resource-url' not found in the document or no resource content available.");
    }

    const files = {
        nmap: `${baseURL}${encodeURIComponent(dirName)}/${fileName}`,
        webUrls: `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-filtered-web-urls-output.txt`,
        httpx: `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-httpx-output.json`,
        dirsearchDefault: generateFileUrls(baseURL, dirName, baseFileName, 'dirsearch-{port}-output.txt', ports),
        dirsearchWordlist: generateFileUrls(baseURL, dirName, baseFileName, 'dirsearch-{port}-wordlist-output.txt', ports),
        whatweb: generateFileUrls(baseURL, dirName, baseFileName, 'whatweb-{port}-output.txt', ports),
        nikto: generateFileUrls(baseURL, dirName, baseFileName, 'nikto-{port}-output.txt', ports),
        nuclei: generateFileUrls(baseURL, dirName, baseFileName, 'nuclei-{port}-output.txt', ports),
        openPortsList: `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-open-ports-list-output.txt`
    };

    await Promise.all([
        fetchFileContent(files.nmap, 'nmap-data'),
        fetchFileContent(files.webUrls, 'web-urls'),
        fetchFileContent(files.httpx, 'httpx-output'),
        fetchMultipleFiles(files.dirsearchDefault, 'dirsearch-default'),
        fetchMultipleFiles(files.dirsearchWordlist, 'dirsearch-wordlist'),
        fetchMultipleFiles(files.whatweb, 'whatweb-output'),
        fetchMultipleFiles(files.nikto, 'nikto-output'),
        fetchMultipleFiles(files.nuclei, 'nuclei-output'),
        fetchFileContent(files.openPortsList, 'open-ports-list')
    ]);
}



// Fetch machine data on page load
window.onload = fetchMachineData;
