      // Smart Attendance System - Complete JavaScript
        class AttendanceSystem {
            constructor() {
                this.students = JSON.parse(localStorage.getItem('students')) || [];
                this.attendance = JSON.parse(localStorage.getItem('attendance')) || {};
                this.currentDate = this.getCurrentDate();
                this.currentStream = null;
                this.selectedStudent = null;
                this.currentCamera = 'environment';
                this.isScanning = false;
                
                this.init();
            }

            init() {
                this.updateCurrentDate();
                this.loadStudentList();
                this.loadAttendanceList();
                this.updateStats();
                this.setupEventListeners();
                
                console.log('Smart Attendance System Initialized');
                this.showNotification('System ready! Start by registering students.', 'success');
            }

            // UTILITY FUNCTIONS
            getCurrentDate() {
                return new Date().toISOString().split('T')[0];
            }

            formatTime(date = new Date()) {
                return date.toLocaleTimeString('en-US', { 
                    hour12: true, 
                    hour: '2-digit', 
                    minute: '2-digit'
                });
            }

            generateStudentId() {
                const prefix = 'BIS';
                const randomNum = Math.floor(1000 + Math.random() * 9000);
                return `${prefix}-${randomNum}`;
            }

            showNotification(message, type = 'info') {
                // Remove existing notifications
                document.querySelectorAll('.notification').forEach(n => n.remove());

                const notification = document.createElement('div');
                notification.className = `notification notification-${type}`;
                notification.innerHTML = `
                    <div class="notification-content">
                        <span class="notification-icon">${
                            type === 'success' ? '✅' : 
                            type === 'error' ? '❌' : 
                            type === 'warning' ? '⚠️' : 'ℹ️'
                        }</span>
                        <span class="notification-message">${message}</span>
                    </div>
                    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
                `;
                
                document.body.appendChild(notification);
                
                setTimeout(() => notification.remove(), 5000);
            }

            // DATA MANAGEMENT
            saveStudents() {
                localStorage.setItem('students', JSON.stringify(this.students));
            }

            saveAttendance() {
                localStorage.setItem('attendance', JSON.stringify(this.attendance));
            }

            // STUDENT MANAGEMENT
            registerStudent() {
                const studentId = document.getElementById('regStudentId').value.trim();
                const name = document.getElementById('regName').value.trim();
                const className = document.getElementById('regClass').value;
                const fatherName = document.getElementById('regFatherName').value.trim();

                // Validation
                if (!studentId || !name || !className || !fatherName) {
                    this.showNotification('Please fill in all required fields (*)', 'error');
                    return false;
                }

                // Check if student ID already exists
                if (this.students.find(s => s.id === studentId)) {
                    this.showNotification('Student ID already exists!', 'error');
                    return false;
                }

                const student = {
                    id: studentId,
                    name: name.toUpperCase(),
                    class: className,
                    fatherName: fatherName,
                    phone: document.getElementById('regPhone').value.trim(),
                    address: document.getElementById('regAddress').value.trim(),
                    registeredDate: new Date().toISOString()
                };

                this.students.push(student);
                this.saveStudents();
                this.loadStudentList();
                this.updateStats();
                
                this.showNotification(`✅ ${name} registered successfully!`, 'success');
                this.clearRegistrationForm();
                return true;
            }

            unregisterStudent(studentId) {
                if (!confirm('Are you sure you want to remove this student?')) return;

                const studentIndex = this.students.findIndex(s => s.id === studentId);
                if (studentIndex !== -1) {
                    const studentName = this.students[studentIndex].name;
                    this.students.splice(studentIndex, 1);
                    this.saveStudents();
                    
                    // Remove from attendance records
                    Object.keys(this.attendance).forEach(date => {
                        delete this.attendance[date][studentId];
                    });
                    this.saveAttendance();
                    
                    this.loadStudentList();
                    this.loadAttendanceList();
                    this.updateStats();
                    
                    this.showNotification(`Student ${studentName} removed`, 'warning');
                }
            }

            clearRegistrationForm() {
                document.getElementById('studentRegistrationForm').reset();
                document.getElementById('regStudentId').value = this.generateStudentId();
            }

            loadStudentList() {
                const container = document.getElementById('registeredStudentsList');
                const searchTerm = document.getElementById('studentSearch')?.value.toLowerCase() || '';
                
                const filteredStudents = this.students.filter(student => 
                    student.name.toLowerCase().includes(searchTerm) ||
                    student.id.toLowerCase().includes(searchTerm)
                );

                container.innerHTML = filteredStudents.length ? 
                    filteredStudents.map(student => `
                        <div class="student-item" onclick="attendanceSystem.selectStudent('${student.id}', this)">
                            <div class="student-info">
                                <div class="student-avatar">
                                    ${student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </div>
                                <div class="student-details">
                                    <h4>${student.name}</h4>
                                    <p>${student.id} | ${student.class}</p>
                                    <small>Father: ${student.fatherName}</small>
                                </div>
                            </div>
                            <div class="student-actions">
                                <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); attendanceSystem.unregisterStudent('${student.id}')">
                                    <span class="material-icons">delete</span> Remove
                                </button>
                            </div>
                        </div>
                    `).join('') : 
                    '<div class="empty-state">No students found</div>';

                this.updateManualEntryDropdown();
            }

            searchStudents() {
                this.loadStudentList();
            }

            refreshStudentList() {
                document.getElementById('studentSearch').value = '';
                this.loadStudentList();
            }
            updateManualEntryDropdown() {
                const select = document.getElementById('manualStudentSelect');
                if (!select) return;
                
                select.innerHTML = '<option value="">Choose a student</option>';
                this.students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id;
                    option.textContent = `${student.name} (${student.id})`;
                    select.appendChild(option);
                });
            }

            selectStudent(studentId, element) {
                this.selectedStudent = this.students.find(s => s.id === studentId);
                
                if (this.selectedStudent) {
                    document.getElementById('selectedStudentInfo').classList.remove('hidden');
                    document.getElementById('selectedStudentName').textContent = this.selectedStudent.name;
                    document.getElementById('selectedStudentId').textContent = this.selectedStudent.id;
                    document.getElementById('generateQRBtn').disabled = false;
                    
                    // Remove previous selection
                    document.querySelectorAll('.student-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    // Add selection to current item
                    element.classList.add('selected');
                }
            }

            // QR CODE GENERATION - UPDATED WITH COMPLETE STUDENT DATA
            generateHighQualityQR() {
                if (!this.selectedStudent) {
                    this.showNotification('Please select a student first', 'error');
                    return;
                }

                const qrContainer = document.getElementById('highQualityQR');
                const quality = parseInt(document.getElementById('qrQuality').value);
                
                qrContainer.innerHTML = '';
                
                // COMPLETE STUDENT DATA IN QR CODE
                const studentData = JSON.stringify({
                    id: this.selectedStudent.id,
                    name: this.selectedStudent.name,
                    class: this.selectedStudent.class,
                    fatherName: this.selectedStudent.fatherName,
                    phone: this.selectedStudent.phone,
                    address: this.selectedStudent.address,
                    registeredDate: this.selectedStudent.registeredDate
                });

                try {
                    new QRCode(qrContainer, {
                        text: studentData,
                        width: quality,
                        height: quality,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });

                    document.getElementById('downloadQRBtn').disabled = false;
                    this.showNotification('QR code generated successfully!', 'success');
                } catch (error) {
                    this.showNotification('Error generating QR code', 'error');
                }
            }

            downloadHighQualityQR() {
                const canvas = document.querySelector('#highQualityQR canvas');
                if (!canvas || !this.selectedStudent) {
                    this.showNotification('No QR code available', 'error');
                    return;
                }

                const link = document.createElement('a');
                link.download = `QR_${this.selectedStudent.id}_${this.selectedStudent.name}.png`;
                link.href = canvas.toDataURL();
                link.click();
                this.showNotification('QR code downloaded!', 'success');
            }

            updateQRQuality() {
                if (this.selectedStudent) {
                    this.generateHighQualityQR();
                }
            }

            generateBulkQR() {
                if (this.students.length === 0) {
                    this.showNotification('No students registered', 'error');
                    return;
                }

                const modal = document.getElementById('bulkQRModal');
                const container = document.getElementById('bulkQRContainer');
                
                container.innerHTML = '<div class="empty-state">Generating QR codes...</div>';
                modal.classList.remove('hidden');
                setTimeout(() => modal.classList.add('show'), 10);

                setTimeout(() => this.generateAllQRCodes(), 100);
            }

            generateAllQRCodes() {
                const container = document.getElementById('bulkQRContainer');
                container.innerHTML = '';

                this.students.forEach((student, index) => {
                    setTimeout(() => {
                        const studentCard = document.createElement('div');
                        studentCard.className = 'qr-student-card';
                        
                        const qrContainer = document.createElement('div');
                        const studentInfo = document.createElement('div');
                        studentInfo.className = 'student-info-qr';
                        studentInfo.innerHTML = `
                            <div class="student-name-qr">${student.name}</div>
                            <div class="student-id-qr">${student.id}</div>
                            <div class="student-class-qr">${student.class}</div>
                        `;

                        studentCard.appendChild(qrContainer);
                        studentCard.appendChild(studentInfo);
                        container.appendChild(studentCard);

                        // COMPLETE STUDENT DATA IN BULK QR CODES
                        const studentData = JSON.stringify({
                            id: student.id,
                            name: student.name,
                            class: student.class,
                            fatherName: student.fatherName,
                            phone: student.phone,
                            address: student.address,
                            registeredDate: student.registeredDate
                        });

                        try {
                            new QRCode(qrContainer, {
                                text: studentData,
                                width: 120,
                                height: 120,
                                colorDark: "#000000",
                                colorLight: "#ffffff"
                            });
                        } catch (error) {
                            console.error('QR generation error:', error);
                        }
                    }, index * 100);
                });

                this.showNotification(`Generated ${this.students.length} QR codes`, 'success');
            }

            printBulkQR() {
                window.print();
            }

            closeBulkQRModal() {
                const modal = document.getElementById('bulkQRModal');
                modal.classList.remove('show');
                setTimeout(() => modal.classList.add('hidden'), 300);
            }

            // CAMERA FUNCTIONS
            async startScanner() {
                try {
                    const video = document.getElementById('scannerVideo');
                    
                    // Stop any existing stream
                    if (this.currentStream) {
                        this.currentStream.getTracks().forEach(track => track.stop());
                    }

                    // Get camera access
                    this.currentStream = await navigator.mediaDevices.getUserMedia({
                        video: { 
                            facingMode: this.currentCamera,
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    });

                    video.srcObject = this.currentStream;
                    
                    // Wait for video to load
                    video.onloadedmetadata = () => {
                        video.play().then(() => {
                            // Update UI
                            document.getElementById('startScanner').disabled = true;
                            document.getElementById('stopScanner').disabled = false;
                            document.getElementById('switchCamera').disabled = false;
                            
                            this.updateScannerStatus('active', 'Scanner active');
                            this.isScanning = true;
                            
                            // Start scanning
                            this.scanLoop();
                        });
                    };

                } catch (error) {
                    console.error('Camera error:', error);
                    let message = 'Cannot access camera. ';
                    if (error.name === 'NotAllowedError') {
                        message += 'Please allow camera permissions.';
                    } else if (error.name === 'NotFoundError') {
                        message += 'No camera found on this device.';
                    } else {
                        message += 'Please check your camera.';
                    }
                    this.showNotification(message, 'error');
                }
            }

            stopScanner() {
                this.isScanning = false;
                
                if (this.currentStream) {
                    this.currentStream.getTracks().forEach(track => track.stop());
                    this.currentStream = null;
                }

                document.getElementById('startScanner').disabled = false;
                document.getElementById('stopScanner').disabled = true;
                document.getElementById('switchCamera').disabled = true;
                
                this.updateScannerStatus('inactive', 'Scanner stopped');
            }

            async switchCamera() {
                this.stopScanner();
                this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
                setTimeout(() => this.startScanner(), 500);
            }
            async scanLoop() {
                const video = document.getElementById('scannerVideo');
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                while (this.isScanning && video.readyState === video.HAVE_ENOUGH_DATA) {
                    try {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        
                        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                        const code = jsQR(imageData.data, imageData.width, imageData.height);
                        
                        if (code) {
                            this.processQRCode(code.data);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    } catch (error) {
                        console.error('Scan error:', error);
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            processQRCode(data) {
                try {
                    const studentData = JSON.parse(data);
                    this.recordAttendance(studentData);
                } catch (error) {
                    this.showNotification('Invalid QR code', 'error');
                }
            }

            recordAttendance(studentData) {
                const student = this.students.find(s => s.id === studentData.id);
                if (!student) {
                    this.showNotification('Student not found!', 'error');
                    return;
                }

                // Initialize today's attendance
                if (!this.attendance[this.currentDate]) {
                    this.attendance[this.currentDate] = {};
                }

                // Check if already marked
                if (this.attendance[this.currentDate][student.id]) {
                    this.showNotification(`${student.name} already marked present!`, 'warning');
                    return;
                }

                // Record attendance with complete student data
                this.attendance[this.currentDate][student.id] = {
                    present: true,
                    time: new Date().toISOString(),
                    studentData: studentData // Store complete QR data with attendance
                };
                this.saveAttendance();

                // Update UI
                this.loadAttendanceList();
                this.updateStats();
                this.addRecentScan(student);
                this.showScanResult(student, true);
                
                this.showNotification(`✅ ${student.name} marked present!`, 'success');
            }

            addRecentScan(student) {
                const container = document.getElementById('recentScansList');
                if (!container) return;
                
                const scanItem = document.createElement('div');
                scanItem.className = 'scan-item present';
                scanItem.innerHTML = `
                    <div class="scan-info">
                        <div class="student-name">${student.name}</div>
                        <div class="scan-time">${this.formatTime()} - ${student.class}</div>
                    </div>
                    <div class="scan-status">✅</div>
                `;
                
                if (container.firstChild?.className === 'empty-state') {
                    container.innerHTML = '';
                }
                container.insertBefore(scanItem, container.firstChild);
                
                // Keep only last 5 scans
                const scans = container.querySelectorAll('.scan-item');
                if (scans.length > 5) {
                    scans[scans.length - 1].remove();
                }
                
                document.getElementById('lastScanTime').textContent = this.formatTime();
            }

            showScanResult(student, isPresent) {
                const modal = document.getElementById('scanModal');
                const content = document.getElementById('scanResultContent');
                
                content.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">${isPresent ? '✅' : '❌'}</div>
                        <h3 style="color: ${isPresent ? '#27ae60' : '#e74c3c'}; margin-bottom: 10px;">
                            ${isPresent ? 'PRESENT' : 'ABSENT'}
                        </h3>
                        <p><strong>Student:</strong> ${student.name}</p>
                        <p><strong>ID:</strong> ${student.id}</p>
                        <p><strong>Class:</strong> ${student.class}</p>
                        <p><strong>Time:</strong> ${this.formatTime()}</p>
                    </div>
                `;
                
                modal.classList.remove('hidden');
                setTimeout(() => modal.classList.add('show'), 10);
            }

            closeModal() {
                const modal = document.getElementById('scanModal');
                modal.classList.remove('show');
                setTimeout(() => modal.classList.add('hidden'), 300);
            }

            // MANUAL ENTRY
            manualEntry() {
                if (this.students.length === 0) {
                    this.showNotification('No students registered', 'error');
                    return;
                }

                document.getElementById('manualDate').value = this.currentDate;
                document.getElementById('manualTime').value = new Date().toTimeString().slice(0, 5);
                
                const modal = document.getElementById('manualEntryModal');
                modal.classList.remove('hidden');
                setTimeout(() => modal.classList.add('show'), 10);
            }

            saveManualEntry() {
                const studentId = document.getElementById('manualStudentSelect').value;
                const date = document.getElementById('manualDate').value;
                const time = document.getElementById('manualTime').value;
                const status = document.querySelector('input[name="attendanceStatus"]:checked').value;
                
                if (!studentId) {
                    this.showNotification('Please select a student', 'error');
                    return;
                }

                const student = this.students.find(s => s.id === studentId);
                if (!student) {
                    this.showNotification('Student not found', 'error');
                    return;
                }

                if (!this.attendance[date]) {
                    this.attendance[date] = {};
                }

                this.attendance[date][studentId] = status === 'present';
                this.saveAttendance();

                if (date === this.currentDate) {
                    this.loadAttendanceList();
                    this.updateStats();
                }

                this.addRecentScan(student);
                this.closeManualEntryModal();
                this.showNotification(`Manual entry saved for ${student.name}`, 'success');
            }

            closeManualEntryModal() {
                const modal = document.getElementById('manualEntryModal');
                modal.classList.remove('show');
                setTimeout(() => modal.classList.add('hidden'), 300);
            }

            // ATTENDANCE MANAGEMENT
            loadAttendanceList() {
                const container = document.getElementById('attendanceList');
                if (!container) return;
                
                const classFilter = document.getElementById('classFilter')?.value || 'all';
                const statusFilter = document.getElementById('statusFilter')?.value || 'all';
                
                let filteredStudents = this.students;
                if (classFilter !== 'all') {
                    filteredStudents = filteredStudents.filter(s => s.class === classFilter);
                }

                const todayAttendance = this.attendance[this.currentDate] || {};

                const attendanceHTML = filteredStudents.map(student => {
                    const isPresent = todayAttendance[student.id];
                    const status = isPresent ? 'present' : 'absent';
                    const statusText = isPresent ? 'Present' : 'Absent';

                    if (statusFilter !== 'all' && status !== statusFilter) {
                        return '';
                    }

                    return `
                        <div class="student-item">
                            <div class="student-info">
                                <div class="student-avatar">
                                    ${student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </div>
                                <div class="student-details">
                                    <h4>${student.name}</h4>
                                    <p>${student.id} | ${student.class}</p>
                                </div>
                            </div>
                            <div class="attendance-status status-${status}">
                                ${statusText}
                            </div>
                        </div>
                    `;
                }).filter(html => html !== '').join('') || '<div class="empty-state">No students match filters</div>';

                container.innerHTML = attendanceHTML;
            }

            filterAttendance() {
                this.loadAttendanceList();
            }

            markAllPresent() {
                if (!confirm('Mark all students as present?')) return;
                
                if (!this.attendance[this.currentDate]) {
                    this.attendance[this.currentDate] = {};
                }
                
                this.students.forEach(student => {
                    this.attendance[this.currentDate][student.id] = true;
                });
                
                this.saveAttendance();
                this.loadAttendanceList();
                this.updateStats();
                this.showNotification('All students marked present', 'success');
            }

            markAllAbsent() {
                if (!confirm('Mark all students as absent?')) return;
                
                if (!this.attendance[this.currentDate]) {
                    this.attendance[this.currentDate] = {};
                }
                
                this.students.forEach(student => {
                    this.attendance[this.currentDate][student.id] = false;
                });
                
                this.saveAttendance();
                this.loadAttendanceList();
                this.updateStats();
                this.showNotification('All students marked absent', 'warning');
            }
            
            // STATS AND DASHBOARD
            updateStats() {
                // Update dashboard
                document.getElementById('totalStudents').textContent = this.students.length;
                
                const todayAttendance = this.attendance[this.currentDate] || {};
                const presentCount = Object.values(todayAttendance).filter(status => status).length;
                const attendanceRate = this.students.length > 0 ? Math.round((presentCount / this.students.length) * 100) : 0;
                
                document.getElementById('presentToday').textContent = presentCount;
                document.getElementById('attendanceRate').textContent = `${attendanceRate}%`;
                
                // Update system info
                document.getElementById('systemTotalStudents').textContent = this.students.length;
                document.getElementById('systemRecordsCount').textContent = Object.keys(this.attendance).length;
                
                // Update reports analytics
                this.updateAnalytics();
            }

            updateAnalytics() {
                const totalRecords = Object.values(this.attendance).reduce((total, day) => total + Object.keys(day).length, 0);
                const daysTracked = Object.keys(this.attendance).length;
                const activeStudents = this.students.length;
                
                let totalAttendanceRate = 0;
                Object.values(this.attendance).forEach(day => {
                    const presentCount = Object.values(day).filter(status => status).length;
                    if (this.students.length > 0) {
                        totalAttendanceRate += (presentCount / this.students.length) * 100;
                    }
                });
                const avgAttendance = daysTracked > 0 ? Math.round(totalAttendanceRate / daysTracked) : 0;
                
                document.getElementById('totalAttendance').textContent = totalRecords;
                document.getElementById('avgAttendance').textContent = `${avgAttendance}%`;
                document.getElementById('daysTracked').textContent = daysTracked;
                document.getElementById('activeStudents').textContent = activeStudents;
                
                this.updateRecentHistory();
            }

            updateRecentHistory() {
                const container = document.getElementById('recentHistory');
                if (!container) return;
                
                const recentDates = Object.keys(this.attendance).sort().reverse().slice(0, 5);
                
                container.innerHTML = recentDates.length ? 
                    recentDates.map(date => {
                        const dayAttendance = this.attendance[date];
                        const presentCount = Object.values(dayAttendance).filter(status => status).length;
                        const absentCount = Object.values(dayAttendance).filter(status => !status).length;
                        const totalCount = presentCount + absentCount;
                        const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
                        
                        return `
                            <div class="history-item">
                                <div class="history-date">${new Date(date).toLocaleDateString()}</div>
                                <div class="history-stats">
                                    <div class="history-stat">Present: <span>${presentCount}</span></div>
                                    <div class="history-stat">Absent: <span>${absentCount}</span></div>
                                    <div class="history-stat">Rate: <span>${rate}%</span></div>
                                </div>
                            </div>
                        `;
                    }).join('') : 
                    '<div class="empty-state">No attendance history</div>';
            }

            updateCurrentDate() {
                const now = new Date();
                const formattedDate = now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                document.getElementById('currentDate').textContent = formattedDate;
                document.getElementById('systemTodayDate').textContent = formattedDate;
            }

            updateScannerStatus(status, message) {
                const statusElement = document.getElementById('scannerStatus');
                const dot = statusElement.querySelector('.status-dot');
                dot.className = 'status-dot ' + (status === 'active' ? 'active' : '');
                statusElement.innerHTML = `<span class="status-dot ${status === 'active' ? 'active' : ''}"></span>${message}`;
            }

            // EXPORT FUNCTIONS - UPDATED WITH COMPLETE DATA
            exportToExcel() {
                let csv = 'Student ID,Name,Class,Father Name,Phone,Address,Registered Date,Status,Attendance Date,Time\n';
                const todayAttendance = this.attendance[this.currentDate] || {};
                
                this.students.forEach(student => {
                    const status = todayAttendance[student.id] ? 'Present' : 'Absent';
                    const time = todayAttendance[student.id]?.time ? 
                        new Date(todayAttendance[student.id].time).toLocaleTimeString() : 'N/A';
                    
                    csv += `"${student.id}","${student.name}","${student.class}","${student.fatherName}","${student.phone}","${student.address}","${student.registeredDate}","${status}","${this.currentDate}","${time}"\n`;
                });
                
                this.downloadCSV(csv, `attendance_${this.currentDate}.csv`);
                this.showNotification('Excel file exported with complete student data', 'success');
            }

            exportAdvancedExcel(type = 'today') {
                let csv = type === 'today' ? this.generateTodayReport() : this.generateCompleteReport();
                this.downloadCSV(csv, `report_${this.currentDate}.csv`);
                this.showNotification('Complete report exported', 'success');
            }

            generateTodayReport() {
                let csv = 'Student ID,Name,Class,Father Name,Phone,Address,Registered Date,Status,Time\n';
                const todayAttendance = this.attendance[this.currentDate] || {};
                
                this.students.forEach(student => {
                    const status = todayAttendance[student.id] ? 'Present' : 'Absent';
                    const time = todayAttendance[student.id]?.time ? 
                        new Date(todayAttendance[student.id].time).toLocaleTimeString() : 'N/A';
                    
                    csv += `"${student.id}","${student.name}","${student.class}","${student.fatherName}","${student.phone}","${student.address}","${student.registeredDate}","${status}","${time}"\n`;
                });
                
                return csv;
            }

            generateCompleteReport() {
                let csv = 'Date,Student ID,Name,Class,Father Name,Phone,Address,Registered Date,Status,Time\n';
                
                Object.keys(this.attendance).sort().forEach(date => {
                    Object.keys(this.attendance[date]).forEach(studentId => {
                        const student = this.students.find(s => s.id === studentId);
                        if (student) {
                            const status = this.attendance[date][studentId] ? 'Present' : 'Absent';
                            const time = this.attendance[date][studentId]?.time ? 
                                new Date(this.attendance[date][studentId].time).toLocaleTimeString() : 'N/A';
                            
                            csv += `"${date}","${student.id}","${student.name}","${student.class}","${student.fatherName}","${student.phone}","${student.address}","${student.registeredDate}","${status}","${time}"\n`;
                        }
                    });
                });
                
                return csv;
            }

            exportStudentListExcel() {
                let csv = 'Student ID,Name,Class,Father Name,Phone,Address,Registered Date\n';
                
                this.students.forEach(student => {
                    csv += `"${student.id}","${student.name}","${student.class}","${student.fatherName}","${student.phone}","${student.address}","${student.registeredDate}"\n`;
                });
                
                this.downloadCSV(csv, `students_complete_${this.currentDate}.csv`);
                this.showNotification('Complete student list exported', 'success');
            }

            exportComprehensiveReport() {
                // Create comprehensive CSV with all data
                let csv = 'Report Type,Student ID,Name,Class,Father Name,Phone,Address,Registered Date,Attendance Date,Status,Time,Export Date\n';
                
                const exportDate = new Date().toISOString();
                
                // Add student information
                this.students.forEach(student => {
                    csv += `"Student Information","${student.id}","${student.name}","${student.class}","${student.fatherName}","${student.phone}","${student.address}","${student.registeredDate}","N/A","N/A","N/A","${exportDate}"\n`;
                });
                
                // Add attendance records
                Object.keys(this.attendance).sort().forEach(date => {
                    Object.keys(this.attendance[date]).forEach(studentId => {
                        const student = this.students.find(s => s.id === studentId);
                        if (student) {
                            const status = this.attendance[date][studentId] ? 'Present' : 'Absent';
                            const time = this.attendance[date][studentId]?.time ? 
                                new Date(this.attendance[date][studentId].time).toLocaleTimeString() : 'N/A';
                            
                            csv += `"Attendance Record","${student.id}","${student.name}","${student.class}","${student.fatherName}","${student.phone}","${student.address}","${student.registeredDate}","${date}","${status}","${time}","${exportDate}"\n`;
                        }
                    });
                });
                
                this.downloadCSV(csv, `comprehensive_report_${this.currentDate}.csv`);
                this.showNotification('Comprehensive report exported with all data', 'success');
            }

            exportAttendance() {
                const data = {
                    students: this.students,
                    attendance: this.attendance,
                    exportDate: new Date().toISOString(),
                    metadata: {
                        totalStudents: this.students.length,
                        totalAttendanceRecords: Object.values(this.attendance).reduce((total, day) => total + Object.keys(day).length, 0),
                        exportType: 'Attendance Data'
                    }
                };
                
                this.downloadJSON(data, `attendance_data_${this.currentDate}.json`);
                this.showNotification('Complete attendance data exported', 'success');
            }

            exportAllData() {
                const data = {
                    system: 'Smart Attendance System v1.0',
                    exportDate: new Date().toISOString(),
                    totalStudents: this.students.length,
                    totalRecords: Object.values(this.attendance).reduce((total, day) => total + Object.keys(day).length, 0),
                    students: this.students,
                    attendance: this.attendance,
                    analytics: {
                        daysTracked: Object.keys(this.attendance).length,
                        classes: this.getClassesSummary(),
                        recentActivity: this.getRecentActivity()
                    }
                };
                
                this.downloadJSON(data, `complete_backup_${this.currentDate}.json`);
                this.showNotification('Complete system backup exported', 'success');
            }

            downloadJSON(data, filename) {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                this.downloadBlob(blob, filename);
            }

            downloadCSV(csv, filename) {
                // Add BOM for UTF-8 to ensure Excel opens it correctly
                const BOM = '\uFEFF';
                const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
                this.downloadBlob(blob, filename);
            }

            downloadBlob(blob, filename) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }

            // SYSTEM MANAGEMENT
            backupData() {
                this.exportAllData();
            }

            generateAnalyticsReport() {
                const report = {
                    generated: new Date().toISOString(),
                    totalStudents: this.students.length,
                    totalRecords: Object.values(this.attendance).reduce((total, day) => total + Object.keys(day).length, 0),
                    daysTracked: Object.keys(this.attendance).length,
                    classes: this.getClassesSummary(),
                    recentActivity: this.getRecentActivity()
                };
                
                this.downloadJSON(report, `analytics_${this.currentDate}.json`);
                this.showNotification('Analytics report generated', 'success');
            }

            getClassesSummary() {
                const summary = {};
                this.students.forEach(student => {
                    summary[student.class] = (summary[student.class] || 0) + 1;
                });
                return summary;
            }

            getRecentActivity() {
                const recentDates = Object.keys(this.attendance).sort().reverse().slice(0, 7);
                return recentDates.map(date => ({
                    date: date,
                    present: Object.values(this.attendance[date]).filter(status => status).length,
                    absent: Object.values(this.attendance[date]).filter(status => !status).length
                }));
            }

            clearAttendanceHistory() {
                if (!confirm('Clear all attendance history? This cannot be undone!')) return;
                
                this.attendance = {};
                this.saveAttendance();
                this.loadAttendanceList();
                this.updateStats();
                this.showNotification('Attendance history cleared', 'warning');
            }

            resetSystemData() {
                if (!confirm('🚨 DANGER: This will delete ALL data!')) return;
                if (!confirm('Are you absolutely sure?')) return;
                
                this.students = [];
                this.attendance = {};
                this.saveStudents();
                this.saveAttendance();
                
                this.loadStudentList();
                this.loadAttendanceList();
                this.updateStats();
                
                this.showNotification('All data reset', 'error');
            }

            setupEventListeners() {
                // Auto-generate student ID
                const studentIdField = document.getElementById('regStudentId');
                if (studentIdField) {
                    studentIdField.value = this.generateStudentId();
                }

                // Form submission
                const form = document.getElementById('studentRegistrationForm');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        this.registerStudent();
                    });
                }
            }
        }

        // Initialize system
        let attendanceSystem;

        document.addEventListener('DOMContentLoaded', function() {
            attendanceSystem = new AttendanceSystem();
        });

        // Global functions
        function switchTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(tab => tab.classList.remove('active'));
            
            document.getElementById(tabName).classList.add('active');
            event.currentTarget.classList.add('active');
        }

        // Make functions global
        window.registerStudent = () => attendanceSystem?.registerStudent();
        window.clearRegistrationForm = () => attendanceSystem?.clearRegistrationForm();
        window.searchStudents = () => attendanceSystem?.searchStudents();
        window.refreshStudentList = () => attendanceSystem?.refreshStudentList();
        window.selectStudent = (id, element) => attendanceSystem?.selectStudent(id, element);
        window.generateHighQualityQR = () => attendanceSystem?.generateHighQualityQR();
        window.downloadHighQualityQR = () => attendanceSystem?.downloadHighQualityQR();
        window.updateQRQuality = () => attendanceSystem?.updateQRQuality();
        window.generateBulkQR = () => attendanceSystem?.generateBulkQR();
        window.printBulkQR = () => attendanceSystem?.printBulkQR();
        window.startScanner = () => attendanceSystem?.startScanner();
        window.stopScanner = () => attendanceSystem?.stopScanner();
        window.switchCamera = () => attendanceSystem?.switchCamera();
        window.manualEntry = () => attendanceSystem?.manualEntry();
        window.saveManualEntry = () => attendanceSystem?.saveManualEntry();
        window.filterAttendance = () => attendanceSystem?.filterAttendance();
        window.markAllPresent = () => attendanceSystem?.markAllPresent();
        window.markAllAbsent = () => attendanceSystem?.markAllAbsent();
        window.exportAttendance = () => attendanceSystem?.exportAttendance();
        window.exportToExcel = () => attendanceSystem?.exportToExcel();
        window.exportAdvancedExcel = (type) => attendanceSystem?.exportAdvancedExcel(type);
        window.exportStudentListExcel = () => attendanceSystem?.exportStudentListExcel();
        window.exportComprehensiveReport = () => attendanceSystem?.exportComprehensiveReport();
        window.exportAllData = () => attendanceSystem?.exportAllData();
        window.backupData = () => attendanceSystem?.backupData();
        window.generateAnalyticsReport = () => attendanceSystem?.generateAnalyticsReport();
        window.clearAttendanceHistory = () => attendanceSystem?.clearAttendanceHistory();
        window.resetSystemData = () => attendanceSystem?.resetSystemData();
        window.closeModal = () => attendanceSystem?.closeModal();
        window.closeManualEntryModal = () => attendanceSystem?.closeManualEntryModal();
        window.closeBulkQRModal = () => attendanceSystem?.closeBulkQRModal();