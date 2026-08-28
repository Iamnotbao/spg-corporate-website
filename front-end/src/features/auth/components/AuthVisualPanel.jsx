export default function AuthVisualPanel() {
  return (
    <aside className="student-auth-visual" aria-hidden="true">
      <div className="student-auth-visual__heading">
        <span>Học tiếng Trung mỗi ngày</span>
        <h2>Một hành trình rõ ràng, từ chữ đầu tiên.</h2>
        <p>Từ vựng, Hán tự và bài học được kết nối trong cùng một nhịp học.</p>
      </div>

      <div className="student-auth-showcase">
        <article className="student-auth-vocabulary-card">
          <div className="student-auth-card-label">
            <span>Từ vựng</span>
            <small>Ví dụ học tập</small>
          </div>
          <strong lang="zh-Hans">学习</strong>
          <p>xuéxí</p>
          <span>học tập</span>
        </article>

        <div className="student-auth-showcase__side">
          <article className="student-auth-hsk-card">
            <div>
              <span>HSK</span>
              <small>Lộ trình minh họa</small>
            </div>
            <ol>
              <li className="is-current">1</li>
              <li>2</li>
              <li>3</li>
            </ol>
          </article>

          <article className="student-auth-lesson-card">
            <span lang="zh-Hans">课</span>
            <div>
              <small>Bài học</small>
              <strong>Chào hỏi cơ bản</strong>
            </div>
          </article>
        </div>

        <article className="student-auth-character-card">
          <div className="student-auth-character-card__glyphs">
            <span lang="zh-Hans">你</span>
            <span lang="zh-Hans">好</span>
          </div>
          <div>
            <small>Hán tự</small>
            <strong>nǐ hǎo</strong>
            <p>xin chào</p>
          </div>
          <span className="student-auth-character-card__practice">Luyện tập</span>
        </article>
      </div>

      <p className="student-auth-visual__note">
        <span /> Nội dung minh họa cho trải nghiệm học tập Hanyora
      </p>
    </aside>
  );
}
