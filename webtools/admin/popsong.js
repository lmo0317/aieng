const CAFE24_API = 'http://aieng.cafe24app.com/api';

let adminKey = '';
let parsedSongs = [];

// JSON 변환 로직 (save-to-server.js와 동일)
function transformJsonToSongs(inputData) {
    const songs = Array.isArray(inputData.content) ? inputData.content : [inputData];
    return songs.map(song => {
        const sentences = (song.sentences || []).map(s => {
            const rawVoca = s.vocabulary || s.voca || '';
            let vocaArray = [];
            if (typeof rawVoca === 'string') {
                vocaArray = rawVoca.split(/,\s*/).map(v => v.trim()).filter(v => v);
            } else if (Array.isArray(rawVoca)) {
                vocaArray = rawVoca;
            }
            return {
                en: s.english || s.en || '',
                ko: s.korean || s.ko || '',
                sentence_structure: s.analysis || s.sentence_structure || '',
                explanation: s.explanation || '',
                voca: vocaArray
            };
        });

        return {
            title: inputData.title || song.song_title || '제목 없음',
            lyrics: song.lyrics || sentences.map(s => s.en).join(' '),
            difficulty: inputData.difficulty || song.difficulty || 'level3',
            sentences,
            quiz: song.quiz || [],
            image: song.image || ''
        };
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const jsonInput = document.getElementById('jsonInput');
    const parseBtn = document.getElementById('parseBtn');
    const saveBtn = document.getElementById('saveBtn');
    const previewBox = document.getElementById('previewBox');
    const previewContent = document.getElementById('previewContent');
    const statusMsg = document.getElementById('statusMsg');
    const songsList = document.getElementById('songs-list');

    // 관리자 키 가져오기
    try {
        const res = await fetch(`${CAFE24_API}/admin-key`);
        const data = await res.json();
        adminKey = data.key;
    } catch (err) {
        console.error('Admin key fetch failed:', err);
    }

    // 미리보기
    parseBtn.addEventListener('click', () => {
        const raw = jsonInput.value.trim();
        if (!raw) {
            showStatus('JSON을 입력해주세요.', 'error');
            return;
        }

        try {
            const inputData = JSON.parse(raw);
            parsedSongs = transformJsonToSongs(inputData);

            previewContent.innerHTML = parsedSongs.map((song, i) => `
                <div style="margin-bottom: ${i < parsedSongs.length - 1 ? '12px' : '0'}; padding-bottom: ${i < parsedSongs.length - 1 ? '12px' : '0'}; border-bottom: ${i < parsedSongs.length - 1 ? '1px solid var(--border-1)' : 'none'};">
                    <div class="preview-title">🎵 ${escHtml(song.title)}</div>
                    <div class="preview-meta">난이도: ${escHtml(song.difficulty)} | 문장 수: ${song.sentences.length}개 | 퀴즈: ${song.quiz.length}개</div>
                    <div class="preview-meta" style="margin-top:4px;">문장 미리보기: ${escHtml(song.sentences[0]?.en || '없음')}</div>
                </div>
            `).join('');

            previewBox.className = 'preview-box visible';
            saveBtn.disabled = false;
            hideStatus();
        } catch (err) {
            parsedSongs = [];
            saveBtn.disabled = true;
            previewBox.className = 'preview-box';
            showStatus('JSON 파싱 오류: ' + err.message, 'error');
        }
    });

    // Cafe24에 저장
    saveBtn.addEventListener('click', async () => {
        if (parsedSongs.length === 0) return;
        if (!confirm(`${parsedSongs.length}개의 팝송을 Cafe24 서버에 저장하시겠습니까?`)) return;

        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중...';

        let successCount = 0;
        let failCount = 0;

        for (const song of parsedSongs) {
            try {
                const res = await fetch(`${CAFE24_API}/songs/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-key': adminKey
                    },
                    body: JSON.stringify(song)
                });
                const result = await res.json();
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                    console.error('Save failed:', song.title, result.error);
                }
            } catch (err) {
                failCount++;
                console.error('Save error:', song.title, err.message);
            }
        }

        saveBtn.textContent = '💾 Cafe24에 저장';
        saveBtn.disabled = false;

        if (failCount === 0) {
            showStatus(`✅ ${successCount}개 저장 완료!`, 'success');
            jsonInput.value = '';
            previewBox.className = 'preview-box';
            parsedSongs = [];
            loadSongs();
        } else {
            showStatus(`완료 ${successCount}개 / 실패 ${failCount}개`, failCount > 0 ? 'error' : 'success');
            loadSongs();
        }
    });

    // 팝송 목록 로드
    async function loadSongs() {
        songsList.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">로딩 중...</p>';
        try {
            const res = await fetch(`${CAFE24_API}/songs/saved`);
            const data = await res.json();
            const songs = data.songs || [];

            if (songs.length === 0) {
                songsList.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">저장된 팝송이 없습니다.</p>';
                return;
            }

            songsList.innerHTML = '';
            songs.forEach(song => {
                const row = document.createElement('div');
                row.className = 'item-row';
                row.innerHTML = `
                    <div class="item-info">
                        <div class="item-title">🎵 ${escHtml(song.title)}</div>
                        <div class="item-meta">Level: ${escHtml(song.difficulty || '-')}</div>
                    </div>
                    <button class="btn-delete" data-id="${song.id}">삭제</button>
                `;
                songsList.appendChild(row);
            });

            songsList.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const title = e.target.closest('.item-row').querySelector('.item-title').textContent;
                    if (!confirm(`'${title}' 팝송을 삭제하시겠습니까?`)) return;

                    try {
                        const res = await fetch(`${CAFE24_API}/trends/${id}`, {
                            method: 'DELETE',
                            headers: { 'x-admin-key': adminKey }
                        });
                        const result = await res.json();
                        if (result.success) {
                            alert('삭제되었습니다.');
                            loadSongs();
                        } else {
                            alert('삭제 실패: ' + result.error);
                        }
                    } catch (err) {
                        alert('에러 발생: ' + err.message);
                    }
                });
            });

        } catch (err) {
            songsList.innerHTML = '<p style="color:#ef4444; padding:20px;">로드 실패 - 서버 연결 확인</p>';
        }
    }

    function showStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.className = `status-msg visible ${type}`;
    }
    function hideStatus() {
        statusMsg.className = 'status-msg';
    }
    function escHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    loadSongs();
});
