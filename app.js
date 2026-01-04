class ImageUploader {
    constructor() {
        this.selectedFiles = [];
        this.uploadedUrls = [];
        this.initElements();
        this.bindEvents();
        this.loadConfig().then(() => {
            console.log('配置加载完成');
        });
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.previewSection = document.getElementById('previewSection');
        this.previewGrid = document.getElementById('previewGrid');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.statusSection = document.getElementById('statusSection');
        this.resultSection = document.getElementById('resultSection');
        this.resultLinks = document.getElementById('resultLinks');
    }

    bindEvents() {
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.uploadBtn.addEventListener('click', () => this.uploadImages());
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            const configData = await response.json();
            this.config = configData;
        } catch (error) {
            console.error('加载配置失败:', error);
            this.config = null;
        }

        const savedActivityName = localStorage.getItem('activityName');
        if (savedActivityName) {
            document.getElementById('activityName').value = savedActivityName;
        }
    }

    saveConfig() {
        const activityName = document.getElementById('activityName').value;
        localStorage.setItem('activityName', activityName);
        return activityName;
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
    }

    processFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (this.selectedFiles.length + imageFiles.length > 3) {
            this.showStatus('最多只能上传 3 张图片', 'error');
            return;
        }

        this.selectedFiles = [...this.selectedFiles, ...imageFiles];
        this.renderPreview();
        this.uploadBtn.disabled = this.selectedFiles.length === 0;
    }

    renderPreview() {
        this.previewGrid.innerHTML = '';
        this.selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <button class="remove-btn" onclick="uploader.removeFile(${index})">×</button>
                `;
                this.previewGrid.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
        this.previewSection.classList.add('active');
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.renderPreview();
        this.uploadBtn.disabled = this.selectedFiles.length === 0;
        if (this.selectedFiles.length === 0) {
            this.previewSection.classList.remove('active');
        }
    }

    showStatus(message, type = 'info') {
        this.statusSection.className = `status-section ${type} active`;
        this.statusSection.innerHTML = message;
    }

    hideStatus() {
        this.statusSection.classList.remove('active');
    }

    async uploadImages() {
        const activityName = this.saveConfig();

        if (!this.config) {
            this.showStatus('配置加载失败，请检查服务器配置', 'error');
            return;
        }

        if (!activityName) {
            this.showStatus('请输入活动名称', 'error');
            return;
        }

        const apiConfig = {
            githubOwner: this.config.github.owner,
            githubRepo: this.config.github.repo,
            githubBranch: this.config.github.branch || 'main',
            feishuAppId: this.config.feishu.app_id,
            feishuAppSecret: this.config.feishu.app_secret,
            feishuBitableAppToken: this.config.feishu.bitable_app_token,
            feishuBitableTableId: this.config.feishu.bitable_table_id,
            fieldName1: this.config.field_names.imgurl1,
            fieldName2: this.config.field_names.imgurl2,
            fieldName3: this.config.field_names.imgurl3,
            activityName: activityName,
            nameFieldName: this.config.field_names.name
        };

        console.log('GitHub Config:', {
            owner: apiConfig.githubOwner,
            repo: apiConfig.githubRepo,
            branch: apiConfig.githubBranch
        });

        this.uploadBtn.disabled = true;
        this.uploadedUrls = [];
        this.hideStatus();
        this.resultSection.classList.remove('active');

        try {
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                this.showStatus(`<span class="loading"></span>正在上传第 ${i + 1}/${this.selectedFiles.length} 张图片...`, 'info');
                
                const url = await this.uploadToGitHub(file, apiConfig);
                this.uploadedUrls.push(url);
            }

            this.showStatus('图片上传成功！正在写入飞书多维表格...', 'success');
            
            await this.writeToFeishu(apiConfig);
            
            this.showResult();
            this.showStatus('所有操作完成！', 'success');
            
        } catch (error) {
            this.showStatus(`操作失败: ${error.message}`, 'error');
        } finally {
            this.uploadBtn.disabled = false;
        }
    }

    async uploadToGitHub(file, config) {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const path = `images/${config.activityName}/${fileName}`;

        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = async (e) => {
                try {
                    const content = e.target.result.split(',')[1];
                    
                    const response = await fetch('/api/github/upload', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            file_name: fileName,
                            file_content: content,
                            path: path
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || '上传到 GitHub 失败');
                    }

                    const data = await response.json();
                    console.log('GitHub upload success:', data);
                    resolve(data.download_url);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('读取文件失败'));
            reader.readAsDataURL(file);
        });
    }

    async searchFeishuRecord(config, activityName) {
        try {
            console.log('搜索飞书记录，参数:', {
                app_id: config.feishuAppId,
                bitable_app_token: config.feishuBitableAppToken,
                bitable_table_id: config.feishuBitableTableId,
                name_field_name: config.nameFieldName,
                activity_name: activityName
            });

            const response = await fetch('/api/feishu/records/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    app_id: config.feishuAppId,
                    app_secret: config.feishuAppSecret,
                    bitable_app_token: config.feishuBitableAppToken,
                    bitable_table_id: config.feishuBitableTableId,
                    name_field_name: config.nameFieldName,
                    activity_name: activityName
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('飞书搜索 API 错误:', response.status, errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || '搜索飞书记录失败');
                } catch (parseError) {
                    throw new Error(`搜索飞书记录失败: ${errorText}`);
                }
            }

            const data = await response.json();
            console.log('飞书搜索成功:', data);
            return data.record_id;
        } catch (error) {
            console.warn('搜索飞书记录失败:', error.message);
            throw error;
        }
    }

    async updateFeishuRecord(config, recordId) {
        try {
            const fields = {};
            if (this.uploadedUrls[0]) {
                fields[config.fieldName1] = this.uploadedUrls[0];
            }
            if (this.uploadedUrls[1]) {
                fields[config.fieldName2] = this.uploadedUrls[1];
            }
            if (this.uploadedUrls[2]) {
                fields[config.fieldName3] = this.uploadedUrls[2];
            }

            const response = await fetch(`/api/feishu/records/${recordId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    app_id: config.feishuAppId,
                    app_secret: config.feishuAppSecret,
                    bitable_app_token: config.feishuBitableAppToken,
                    bitable_table_id: config.feishuBitableTableId,
                    fields: fields
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '更新飞书记录失败');
            }

            const data = await response.json();
            console.log('飞书记录更新成功:', data);
        } catch (error) {
            console.warn('更新飞书记录失败:', error.message);
            throw error;
        }
    }

    async writeToFeishu(config) {
        if (!config.feishuAppSecret || !config.feishuBitableAppToken || !config.feishuBitableTableId) {
            console.warn('飞书配置不完整，跳过写入操作');
            return;
        }

        try {
            const existingRecordId = await this.searchFeishuRecord(config, config.activityName);

            const fields = {};
            fields[config.nameFieldName] = config.activityName;
            if (this.uploadedUrls[0]) {
                fields[config.fieldName1] = this.uploadedUrls[0];
            }
            if (this.uploadedUrls[1]) {
                fields[config.fieldName2] = this.uploadedUrls[1];
            }
            if (this.uploadedUrls[2]) {
                fields[config.fieldName3] = this.uploadedUrls[2];
            }

            if (existingRecordId) {
                await this.updateFeishuRecord(config, existingRecordId);
                console.log('已更新现有记录');
            } else {
                const response = await fetch('/api/feishu/records', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        app_id: config.feishuAppId,
                        app_secret: config.feishuAppSecret,
                        bitable_app_token: config.feishuBitableAppToken,
                        bitable_table_id: config.feishuBitableTableId,
                        fields: fields
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '写入飞书多维表格失败');
                }

                const data = await response.json();
                console.log('飞书记录创建成功:', data);
            }
        } catch (error) {
            console.warn('写入飞书多维表格失败:', error.message);
            throw error;
        }
    }

    showResult() {
        this.resultSection.classList.add('active');
        this.resultLinks.innerHTML = this.uploadedUrls.map((url, index) => `
            <div class="result-link">
                <strong>图片 ${index + 1}:</strong> <a href="${url}" target="_blank">${url}</a>
            </div>
        `).join('');
    }
}

const uploader = new ImageUploader();
