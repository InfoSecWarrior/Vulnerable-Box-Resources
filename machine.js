// Helper function to fetch file content
async function fetchFileContent(url, elementId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`File not found: ${url}`);
        const data = await response.text();
        document.getElementById(elementId).textContent = data || 'No data available';
        return data; // Return the data (but no longer used for ZIP)
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

// Function to generate URLs based on dynamic number ranges
function generateFileUrls(baseURL, dirName, baseFileName, type, maxRange) {
    const urls = [];
    for (let i = 1; i <= maxRange; i++) {
        let url = `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-${type.replace('{i}', i)}.txt`;
        urls.push(url);
    }
    return urls;
}

// Function to detect the maximum range for files (Dummy function for demonstration)
async function detectMaxRange(baseURL, dirName, baseFileName, type) {
    // Placeholder implementation: Assume range 1-5 for demonstration
    return 5;
}

// Function to fetch and display all machine-related data
async function fetchMachineData() {
    // Get the directory and filename from the URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const dirName = urlParams.get('dir');  // The directory name
    let fileName = urlParams.get('file');  // The filename (e.g., 'web-nmap-scan.nmap')

    if (!dirName || !fileName) {
        console.error('Directory or filename not provided.');
        return;
    }

    // Remove "-nmap-scan" from the file name for some files
    const baseFileName = fileName.replace(/-nmap-scan/, '').replace(/\.[^/.]+$/, '');

    // Update the <h1> title with the directory name
    const machineTitleElement = document.getElementById('machine-title');
    machineTitleElement.textContent = decodeURIComponent(dirName) || 'Unknown Machine';

    // Update the GitHub link
    const githubBaseURL = 'https://github.com/infoSecWarrior/Vulnerable-Box-Resources/tree/main/';
    const githubLink = document.getElementById('github-url');
    githubLink.href = `${githubBaseURL}${encodeURIComponent(dirName)}`;
    githubLink.textContent = `View ${decodeURIComponent(dirName)} on GitHub`;

    // Base URL for all file fetches
    const baseURL = 'https://raw.githubusercontent.com/infoSecWarrior/Vulnerable-Box-Resources/main/';

    // File URLs based on the patterns provided
    const files = {
        nmap: `${baseURL}${encodeURIComponent(dirName)}/${fileName}`,
        webUrls: `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-filtered-web-urls.txt`,
        httpx: `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-httpx-output.json`,
        dirsearchDefault: await generateFileUrls(baseURL, dirName, baseFileName, 'dirsearch-u{i}', await detectMaxRange(baseURL, dirName, baseFileName, 'dirsearch-u{i}')),
        dirsearchWordlist: await generateFileUrls(baseURL, dirName, baseFileName, 'dirsearch-u{i}-wordlist', await detectMaxRange(baseURL, dirName, baseFileName, 'dirsearch-u{i}-wordlist')),
        whatweb: await generateFileUrls(baseURL, dirName, baseFileName, 'whatweb-{i}', await detectMaxRange(baseURL, dirName, baseFileName, 'whatweb-{i}')),
        nikto: `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-nikto-output.txt`,
        nuclei: `${baseURL}${encodeURIComponent(dirName)}/${baseFileName}-nuclei-output.txt`
    };

    // Fetch all the data and store it
    await Promise.all([
        fetchFileContent(files.nmap, 'nmap-data'),
        fetchFileContent(files.webUrls, 'web-urls'),
        fetchFileContent(files.httpx, 'httpx-output'),
        fetchMultipleFiles(files.dirsearchDefault, 'dirsearch-default'),
        fetchMultipleFiles(files.dirsearchWordlist, 'dirsearch-wordlist'),
        fetchMultipleFiles(files.whatweb, 'whatweb-output'),
        fetchFileContent(files.nikto, 'nikto-output'),
        fetchFileContent(files.nuclei, 'nuclei-output')
    ]);
}

// Fetch machine data on page load
window.onload = fetchMachineData;