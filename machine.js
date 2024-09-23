// Helper function to fetch file content
async function fetchFileContent(url, elementId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`File not found: ${url}`);
        const data = await response.text();
        document.getElementById(elementId).textContent = data || 'No data available';
        return data;
    } catch (error) {
        document.getElementById(elementId).textContent = `Error loading data from ${url}`;
        console.error(`Error loading data from ${url}:`, error);
        return null;
    }
}

// Helper function to fetch and combine multiple files
async function fetchMultipleFiles(fileUrls, elementId) {
    let combinedData = '';
    for (const url of fileUrls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.text();
                combinedData += data + '\n';
            }
        } catch (error) {
            console.error(`Error loading data from ${url}:`, error);
        }
    }
    document.getElementById(elementId).textContent = combinedData || 'No data available';
    return combinedData;
}

// Function to generate URLs based on dynamic number ranges and ports
function generateFileUrls(baseURL, dirName, baseFileName, type, ports) {
    const urls = [];
    for (const port of ports) {
        let url = `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-${type.replace('{port}', port)}.txt`;
        urls.push(url);
    }
    return urls;
}

// Function to fetch open ports from a remote file
async function fetchOpenPorts(baseURL, dirName, baseFileName) {
    const openPortsUrl = `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-open-ports-list.txt`;
    const data = await fetchFileContent(openPortsUrl, 'open-ports-list');
    if (data) {
        // Parse the port data
        return data.split(',').map(port => port.trim()).filter(port => port); // Remove empty strings
    }
    return []; // Return an empty array if there's an error
}

// Function to fetch and display all machine-related data
async function fetchMachineData() {
    const urlParams = new URLSearchParams(window.location.search);
    const dirName = urlParams.get('dir');
    let fileName = urlParams.get('file');

    if (!dirName || !fileName) {
        console.error('Directory or filename not provided.');
        return;
    }

    const baseFileName = fileName.replace(/-nmap-version-scan/, '').replace(/\.[^/.]+$/, '');
    const machineTitleElement = document.getElementById('machine-title');
    machineTitleElement.textContent = decodeURIComponent(dirName) || 'Unknown Machine';

    const githubBaseURL = 'https://github.com/InfoSecWarrior/Vulnerable-Box-Resources/tree/main/';
    const githubLink = document.getElementById('github-url');
    githubLink.href = `${githubBaseURL}${encodeURIComponent(dirName)}`;
    githubLink.textContent = `View ${decodeURIComponent(dirName)} on GitHub`;

    const baseURL = 'https://raw.githubusercontent.com/InfoSecWarrior/Vulnerable-Box-Resources/main/';
    
    // Fetch open ports
    const ports = await fetchOpenPorts(baseURL, dirName, baseFileName);

    const files = {
        nmap: `${baseURL}${encodeURIComponent(dirName)}/${fileName}`,
        webUrls: `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-filtered-web-urls.txt`,
        httpx: `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-httpx-output.json`,
        dirsearchDefault: await generateFileUrls(baseURL, dirName, baseFileName, 'dirsearch-{port}', ports),
        dirsearchWordlist: await generateFileUrls(baseURL, dirName, baseFileName, 'dirsearch-{port}-wordlist', ports),
        whatweb: await generateFileUrls(baseURL, dirName, baseFileName, 'whatweb-{port}', ports),
        nikto: await generateFileUrls(baseURL, dirName, baseFileName, 'nikto-{port}-output', ports),
        nuclei: await generateFileUrls(baseURL, dirName, baseFileName, 'nuclei-{port}-output', ports),
        openPortsList: `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-open-ports-list.txt` // URL for open-ports-list
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
        fetchFileContent(files.openPortsList, 'open-ports-list') // Fetching open-ports-list
    ]);
}

// Fetch machine data on page load
window.onload = fetchMachineData;
