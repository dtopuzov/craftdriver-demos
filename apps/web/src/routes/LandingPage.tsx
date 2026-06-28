import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="EasyMath home">
          <span className="brand-mark" aria-hidden="true">
            +
          </span>
          <span>
            Easy<span>Math</span>
          </span>
        </Link>
        <div className="landing-account-links">
          <Link className="header-register" to="/register">
            Create account
          </Link>
          <Link className="header-login" to="/login">
            Sign in
          </Link>
        </div>
      </header>

      <section className="hero" aria-labelledby="easy-math-title">
        <div className="hero-copy">
          <p className="eyebrow">Maths confidence, one step at a time</p>
          <h1 id="easy-math-title">A brighter way to prepare for every maths test.</h1>
          <p className="hero-intro">
            EasyMath helps children in Years 1-4 build strong foundations with clear lessons,
            friendly practice, and exam-style tests that make progress visible.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/register">
              Start learning
            </Link>
            <a className="text-link" href="#how-it-works">
              See how it works <span aria-hidden="true">v</span>
            </a>
          </div>
          <dl className="hero-stats" aria-label="EasyMath benefits">
            <div>
              <dt>Years 1-4</dt>
              <dd>tailored learning</dd>
            </div>
            <div>
              <dt>Short lessons</dt>
              <dd>easy to fit in</dd>
            </div>
            <div>
              <dt>Practice tests</dt>
              <dd>ready for exam day</dd>
            </div>
          </dl>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="math-orbit orbit-one">+</div>
          <div className="math-orbit orbit-two">/</div>
          <div className="math-orbit orbit-three">x</div>
          <div className="lesson-card">
            <div className="lesson-card-top">
              <span>Today&apos;s challenge</span>
              <span className="sparkle">*</span>
            </div>
            <p>Can you solve it?</p>
            <div className="equation">
              <strong>24</strong>
              <span>+</span>
              <strong>18</strong>
              <span>=</span>
              <b>?</b>
            </div>
            <div className="answer-row">
              <span>40</span>
              <span className="selected-answer">42</span>
              <span>44</span>
            </div>
            <div className="progress-line">
              <span />
            </div>
          </div>
          <div className="score-chip">
            <span>*</span>
            <strong>Great work!</strong>
            <small>3 day streak</small>
          </div>
          <div className="pencil" />
        </div>
      </section>

      <section className="trust-strip" aria-label="EasyMath focus areas">
        <span>Numbers</span>
        <i />
        <span>Problem solving</span>
        <i />
        <span>Exam confidence</span>
      </section>

      <section className="feature-section" id="how-it-works" aria-labelledby="learn-heading">
        <div className="section-heading">
          <p className="eyebrow">Built for young learners</p>
          <h2 id="learn-heading">Practice that feels encouraging, not overwhelming.</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-icon lesson-icon">=</span>
            <h3>Learn clearly</h3>
            <p>Short, focused lessons explain each idea in language children understand.</p>
          </article>
          <article className="feature-card featured-card">
            <span className="feature-icon practice-icon">OK</span>
            <h3>Practise at their pace</h3>
            <p>Helpful questions build fluency and make every new skill feel achievable.</p>
          </article>
          <article className="feature-card">
            <span className="feature-icon exam-icon">*</span>
            <h3>Feel ready for tests</h3>
            <p>Exam-style practice helps turn calm preparation into real confidence.</p>
          </article>
        </div>
      </section>

      <section className="cta-panel" aria-labelledby="cta-heading">
        <div>
          <p className="eyebrow">Ready when they are</p>
          <h2 id="cta-heading">Small steps today. Big confidence tomorrow.</h2>
        </div>
        <Link className="button button-light" to="/register">
          Create an EasyMath account <span aria-hidden="true">-&gt;</span>
        </Link>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand footer-brand" to="/" aria-label="EasyMath home">
          <span className="brand-mark" aria-hidden="true">
            +
          </span>
          <span>
            Easy<span>Math</span>
          </span>
        </Link>
        <p>Helping young minds enjoy maths.</p>
      </footer>
    </main>
  );
}
