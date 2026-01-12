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
        this.reuploadBtn = document.getElementById('reuploadBtn');
    }

    bindEvents() {
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.uploadBtn.addEventListener('click', () => this.uploadImages());
        this.reuploadBtn.addEventListener('click', () => this.reupload());
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
        return { activityName };
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
        const { activityName } = this.saveConfig();
        const activityCity = document.getElementById('activityCity').value;
        const activityDate = document.getElementById('activityDate').value;
        const workshopType = document.getElementById('workshopType').value;
        const activityHighlights = document.getElementById('activityHighlights').value;
        const quoteText = document.getElementById('quoteText').value;
        const quoteAuthor = document.getElementById('quoteAuthor').value;
        const quoteText2 = document.getElementById('quoteText2').value;
        const quoteAuthor2 = document.getElementById('quoteAuthor2').value;
        const quoteText3 = document.getElementById('quoteText3').value;
        const quoteAuthor3 = document.getElementById('quoteAuthor3').value;

        if (!this.config) {
            this.showStatus('配置加载失败，请检查服务器配置', 'error');
            return;
        }

        if (!activityName) {
            this.showStatus('请输入活动名称', 'error');
            return;
        }

        // 处理高亮，按换行分隔
        const highlightsArray = activityHighlights.split('\n').filter(line => line.trim() !== '');

        const apiConfig = {
            githubOwner: this.config.github.owner,
            githubRepo: this.config.github.repo,
            githubBranch: this.config.github.branch || 'main',
            feishuAppId: this.config.feishu.app_id,
            feishuAppSecret: this.config.feishu.app_secret,
            feishuBitableAppToken: this.config.feishu.bitable_app_token,
            feishuBitableTableId: this.config.feishu.bitable_table_id,
            
            // 字段配置
            fieldNames: this.config.field_names,
            
            // 基础数据
            activityName: activityName,
            
            // 表格数据
            fieldsData: {
                [this.config.field_names.name]: activityName,
                [this.config.field_names.city]: activityCity,
                [this.config.field_names.date]: activityDate,
                [this.config.field_names.workshop_type]: workshopType,
                [this.config.field_names.highlights]: highlightsArray,
                [this.config.field_names.quote_text]: quoteText,
                [this.config.field_names.quote_author]: quoteAuthor,
                [this.config.field_names.quote_text_2]: quoteText2,
                [this.config.field_names.quote_author_2]: quoteAuthor2,
                [this.config.field_names.quote_text_3]: quoteText3,
                [this.config.field_names.quote_author_3]: quoteAuthor3
            }
        };

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

    async compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // 限制最大尺寸，防止过大，兼顾清晰度
                    const MAX_SIZE = 1600; 
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 压缩质量 0.7，通常能将几MB的图片压缩到几百KB
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                };
                img.onerror = (e) => reject(new Error('图片加载失败'));
            };
            reader.onerror = () => reject(new Error('读取文件失败'));
        });
    }

    async uploadToGitHub(file, config) {
        const timestamp = Date.now();
        // 强制使用 jpg 后缀，因为 canvas 导出的是 jpg
        const fileName = `${timestamp}_${file.name.replace(/\.[^/.]+$/, "")}.jpg`;
        const path = `images/${config.activityName}/${fileName}`;

        try {
            // 1. 压缩图片
            const compressedDataUrl = await this.compressImage(file);
            const content = compressedDataUrl.split(',')[1];
            
            // 2. 上传
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

            // 3. 处理响应
            const responseText = await response.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('JSON 解析失败，原始响应:', responseText);
                // 如果解析失败，检查是否是常见的 Vercel 错误
                if (responseText.includes('Request Entity Too Large') || responseText.includes('FUNCTION_PAYLOAD_LIMIT_EXCEEDED')) {
                     throw new Error('图片太大，压缩后仍超过服务器限制。请尝试使用更小的图片。');
                }
                throw new Error(`服务器响应错误: ${responseText.substring(0, 100)}`);
            }

            if (!response.ok) {
                throw new Error(data.error || '上传到 GitHub 失败');
            }

            console.log('GitHub upload success:', data);
            return data.download_url;
        } catch (error) {
            console.error('上传过程出错:', error);
            throw error;
        }
    }

    async searchFeishuRecord(config, searchValue) {
        try {
            console.log('搜索飞书记录，参数:', {
                app_id: config.feishuAppId,
                bitable_app_token: config.feishuBitableAppToken,
                bitable_table_id: config.feishuBitableTableId,
                name_field_name: config.fieldNames.name,
                search_value: searchValue
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
                    name_field_name: config.fieldNames.name,
                    activity_name: searchValue
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

    async updateFeishuRecord(config, recordId, fields) {
        try {
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
            // 使用 activityName 搜索现有记录
            const existingRecordId = await this.searchFeishuRecord(config, config.activityName);

            // 构造字段数据
            const fields = { ...config.fieldsData };
            
            // 添加图片链接
            if (this.uploadedUrls[0]) fields[config.fieldNames.imgurl1] = this.uploadedUrls[0];
            if (this.uploadedUrls[1]) fields[config.fieldNames.imgurl2] = this.uploadedUrls[1];
            if (this.uploadedUrls[2]) fields[config.fieldNames.imgurl3] = this.uploadedUrls[2];

            if (existingRecordId) {
                await this.updateFeishuRecord(config, existingRecordId, fields);
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
                    throw new Error(errorData.error || '创建飞书记录失败');
                }

                const data = await response.json();
                console.log('飞书记录创建成功:', data);
            }
        } catch (error) {
            console.error('写入飞书失败:', error);
            throw new Error(`写入飞书失败: ${error.message}`);
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

    reupload() {
        this.selectedFiles = [];
        this.uploadedUrls = [];
        this.fileInput.value = '';
        this.previewGrid.innerHTML = '';
        this.previewSection.classList.remove('active');
        this.resultSection.classList.remove('active');
        this.hideStatus();
        this.uploadBtn.disabled = true;
    }
}

const uploader = new ImageUploader();
