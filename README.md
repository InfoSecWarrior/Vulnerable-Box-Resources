<h1 align="center">Vulnerable Box Resources</h1>

<p align="center">
    <strong> Live Application https://vulnerable-box-resources.infosecwarrior.com </strong>
</p>

**Vulnerable Box Resources** is a curated collection of scan outputs and data designed to help you analyze and exploit vulnerable machines. This repository provides detailed insights into the inner workings of your target systems, making it easier to identify potential security gaps, weaknesses, and attack vectors.

## Features

- **Nmap Port Scanning**: Gain detailed insights into open ports, running services, and potential security weaknesses on the target machine.

- **Directory Bruteforcing**: Uncover hidden directories and files on web servers using tools like `dirsearch`, revealing potential entry points and misconfigurations.

- **Web Technology Identification**: Identify technologies used by the target website using tools like `whatweb`.

- **Vulnerability Scanners**: Scanning results from tools like `nikto` and `nuclei` to identify known vulnerabilities, misconfigurations, and security flaws in web applications.

## How to Submit Your Target Machine Data

To contribute your scan data to this repository, please follow these steps:

1. **Run the Scanning Script**: 
   Visit the [Box Scanning Script](https://github.com/infoSecWarrior/Offensive-Pentesting-Scripts/tree/main/Box-Scan) repository to download the scanning script and follow the installation instructions provided.

2. **Install and Execute the Script**: 
   Once you have the script, run it using the following command. Replace `<target_ip>` with your target machine's IP address and `<box-name-prefix>` with your desired directory and filename prefix:
   

   ```bash
   python box-scan.py -t <target_ip> -o <box-name-prefix>
   ```

3. **Submit Your Scanning Results**: 
   Once the script completes scanning, follow these steps to submit your data:

   - **Fork the Repository**: Fork the Vulnerable Box Resources repository to your GitHub account.
   - **Create a New Directory**: If your target box is from platforms like `InfosecWarrior`, `VulnHub`, or `HackTheBox`, create a new directory under the respective folder (e.g., `Infosecwarrior`, `Vulnhub`, `Hack-The-Box`). If it belongs to a different platform, create a directory under the `Other` folder. Name the directory after the target machine (e.g., `Box-Name`), and upload all scan data to this folder.

4. **Get the Raw Link of Your Nmap Scan File**: 
   Navigate to the directory you created, and copy the raw link of your `{box-name-prefix}-nmap-version-scan-output.xml` file. 

   Example format:

   ```
   https://raw.githubusercontent.com/InfoSecWarrior/Vulnerable-Box-Resources/refs/heads/main/{Resource}/{Machine-Name}/{output_directory_prefix}-nmap-version-scan-output.xml
   ```

5. **Modify the Username in the URL**: 
   Replace `your-github-username` with `InfoSecWarrior` in the raw link.

   For example:
   ```
   https://raw.githubusercontent.com/InfoSecWarrior/Vulnerable-Box-Resources/refs/heads/main/Infosecwarrior/Wordpress-Host-Server-1/Wordpress_host_server_1-nmap-version-scan-output.xml
   ```

6. **Update the Raw-File-Links.txt**: 
   Open the `{Resource}-Raw-File-Links.txt` file in the repository and add the modified URL of your Nmap scan file.

7. **Create a Pull Request**: 
   After making all necessary changes, go to your forked repository, navigate to "Pull Requests," and select "New Pull Request."