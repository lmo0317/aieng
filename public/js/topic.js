// topic.js - 주제 입력 페이지 전용 JS

document.getElementById('start-btn').addEventListener('click', () => {
    const topic = document.getElementById('topic').value.trim();
    const difficulty = document.getElementById('difficulty').value;

    if (!topic) {
        window.showAlert('학습할 주제를 입력해 주세요.');
        return;
    }

    // learn 페이지로 이동 (topic + difficulty 파라미터)
    const params = new URLSearchParams({ topic, difficulty, source: 'topic' });
    window.location.href = `/learn?${params.toString()}`;
});
