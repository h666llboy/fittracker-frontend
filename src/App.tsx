// frontend/src/App.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import './App.css';
import ImportProgram from './ImportProgram';

/* ---------- типы ---------- */
type Exercise = {
  id: number;
  name: string;
  tip: string | null;
  yt_search: string | null;
  sets: number;
  reps: number;
  weight: number;
};

type WorkoutProgram = {
  id: number;
  title: string;
  exercises: Exercise[];
};

type ShortProgram = {
  id: number;
  title: string;
  ex_count: number;
};

type FinishedWorkout = {
  id: number;
  finished_at: string;
  duration_sec: number;
  exercises_done: string[];
};

function App() {
  /* ---------- состояния ---------- */
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [history, setHistory] = useState<FinishedWorkout[]>([]);
  const [programs, setPrograms] = useState<ShortProgram[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingProg, setEditingProg] = useState<WorkoutProgram | null>(null);
  const [soundFile, setSoundFile] = useState<string>('beep.wav');

  /* ---------- PWA: кнопка «Установить» ---------- */
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') console.log('Пользователь установил приложение');
      setDeferredPrompt(null);
    } else {
      alert('Установка недоступна в этом браузере');
    }
  };

  /* ---------- загрузка данных ---------- */
  useEffect(() => {
    const BACKEND_URL = 'https://fittracker-backend-ptcq.onrender.com';
    axios.get(`${BACKEND_URL}/exercises`).then(res => setExercises(res.data));
    loadHistory();
    loadPrograms();
  }, []);

  const loadHistory = async () => {
    const res = await axios.get<FinishedWorkout[]>('http://127.0.0.1:8000/workouts/history');
    setHistory(res.data);
  };

  const loadPrograms = async () => {
    const res = await axios.get<ShortProgram[]>('http://127.0.0.1:8000/programs');
    setPrograms(res.data);
  };

  const loadProgramExercises = async (id: number) => {
    const res = await axios.get<WorkoutProgram>(`http://127.0.0.1:8000/programs/${id}`);
    setExercises(res.data.exercises);
    setSelectedId(id);
  };

  /* ---------- таймер + выбор звука ---------- */
  const startTimer = (sec: number) => {
    setTotalSeconds(sec);
    setSecondsLeft(sec);
    setStartTime(Date.now());
    const end = Date.now() + sec * 1000;
    const int = setInterval(() => {
      const left = Math.round((end - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(int);
        setSecondsLeft(0);
        beep();
      } else {
        setSecondsLeft(left);
      }
    }, 1000);
  };

  const beep = () => {
    const audio = new Audio(`/sounds/${soundFile}`);
    audio.play();
  };

  /* ---------- завершить тренировку ---------- */
  const finishWorkout = async () => {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const names = exercises.map(e => e.name);
    await axios.post('http://127.0.0.1:8000/workouts/finish', { duration, exercises: names });
    alert('Тренировка сохранена!');
    loadHistory();
  };

  /* ---------- удаление / редактирование ---------- */
  const deleteProgram = async (id: number) => {
    if (!window.confirm('Удалить программу?')) return;
    await axios.delete(`http://127.0.0.1:8000/programs/${id}`);
    alert('Удалено');
    loadPrograms();
    if (selectedId === id) {
      setSelectedId(null);
      setExercises([]);
    }
  };

  const saveEdit = async () => {
    if (!editingProg) return;
    await axios.put(`http://127.0.0.1:8000/programs/${editingProg.id}`, editingProg);
    alert('Сохранено');
    setEditingProg(null);
    loadPrograms();
    if (selectedId === editingProg.id) setExercises(editingProg.exercises);
  };

  /* ---------- расчёты для круга ---------- */
  const percentage = totalSeconds ? Math.round((secondsLeft / totalSeconds) * 100) : 0;

  return (
    <div className="app-dark">
      <h1>Моя тренировка</h1>

      <ImportProgram onImported={() => window.location.reload()} />

      <button
        onClick={() => {
          const template = {
            title: 'Моя программа',
            exercises: [
              {
                id: 1,
                name: 'Упражнение 1',
                tip: 'Краткий совет по технике',
                yt_search: 'название упражнения shorts',
                sets: 3,
                reps: 10,
                weight: 0
              }
            ]
          };
          const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'template_workout.json';
          a.click();
          URL.revokeObjectURL(url);
        }}
        style={{ marginBottom: '1rem' }}
      >
        Скачать шаблон JSON
      </button>

      {programs.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <b>Выбрать программу:</b>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {programs.map(p => (
              <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                <button
                  onClick={() => loadProgramExercises(p.id)}
                  style={{ flex: 1, textAlign: 'left' }}
                >
                  {p.title} ({p.ex_count})
                </button>
                <button
                  onClick={async () => {
                    const full = await axios.get<WorkoutProgram>(`http://127.0.0.1:8000/programs/${p.id}`);
                    setEditingProg(full.data);
                  }}
                >
                  ✏️
                </button>
                <button onClick={() => deleteProgram(p.id)}>🗑️</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- выбор звука таймера ---------- */}
      <label style={{ marginBottom: '1rem', display: 'block' }}>
        Звук таймера:
        <select value={soundFile} onChange={e => setSoundFile(e.target.value)} style={{ marginLeft: 8 }}>
          <option value="beep.wav">Бип</option>
          <option value="gong.wav">Гонг</option>
          <option value="voice.wav">Голос «отдых окончен»</option>
        </select>
      </label>

      <hr style={{ margin: '1rem 0' }} />

      <ul className="ex-list">
        {exercises.map(ex => (
          <li key={ex.id} className="ex-card">
            <strong>{ex.name}</strong>
            <p>
              {ex.sets} подходов × {ex.reps} повторений {ex.weight ? `× ${ex.weight} кг` : ''}
            </p>
            <p>{ex.tip ?? 'Совет скоро появится'}</p>
            <a href={`https://www.youtube.com/results?search_query=${ex.yt_search}`} target="_blank" rel="noreferrer">
              Смотреть shorts
            </a>
          </li>
        ))}
      </ul>

      <hr style={{ margin: '2rem 0' }} />
      <h2>Отдых</h2>

      <div style={{ width: 150, margin: '0 auto 1rem' }}>
        <CircularProgressbar
          value={percentage}
          text={`${secondsLeft}s`}
          styles={buildStyles({
            textSize: '22px',
            pathColor: '#90caf9',
            textColor: '#fff',
            trailColor: '#333',
          })}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={() => startTimer(60)}>60 с</button>
        <button onClick={() => startTimer(90)}>90 с</button>
        <button onClick={() => startTimer(120)}>120 с</button>
        <button onClick={() => startTimer(180)}>180 с</button>
      </div>

      <button
        onClick={finishWorkout}
        style={{ marginTop: '2rem', fontSize: '1.2rem', padding: '0.5rem 1rem' }}
      >
        Завершить тренировку
      </button>

      <hr style={{ margin: '2rem 0' }} />
      <h2>История тренировок</h2>
      <ul style={{ textAlign: 'left', maxWidth: 500, margin: '0 auto' }}>
        {history.map(w => (
          <li key={w.id}>
            {new Date(w.finished_at).toLocaleString('ru-RU')} — {w.duration_sec} с, упражнений: {w.exercises_done.length}
          </li>
        ))}
      </ul>

      <button
        onClick={async () => {
          const res = await axios.get('http://127.0.0.1:8000/export-history', { responseType: 'blob' });
          const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = 'workout_history.csv';
          a.click();
          URL.revokeObjectURL(url);
        }}
        style={{ marginTop: '1rem' }}
      >
        Скачать историю (CSV)
      </button>

      {/* ---------- PWA: кнопка «Установить» ---------- */}
      {deferredPrompt && (
        <button
          onClick={async () => {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') console.log('Пользователь установил приложение');
            setDeferredPrompt(null);
          }}
          style={{ marginBottom: '1rem' }}
        >
          📲 Установить приложение
        </button>
      )}

      {/* ---------- модальное окно редактирования ---------- */}
      {editingProg && (
        <dialog open style={{ padding: '1rem', width: 400 }}>
          <h3>Редактировать программу</h3>
          <label>
            Название:
            <input
              value={editingProg.title}
              onChange={e => setEditingProg({ ...editingProg, title: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>
          <br />
          <label>
            Упражнения (JSON):
            <textarea
              value={JSON.stringify(editingProg.exercises, null, 2)}
              onChange={e => {
                try {
                  const arr = JSON.parse(e.target.value);
                  setEditingProg({ ...editingProg, exercises: arr });
                } catch {}
              }}
              rows={6}
              style={{ width: '100%' }}
            />
          </label>
          <br />
          <button onClick={saveEdit}>Сохранить</button>
          <button onClick={() => setEditingProg(null)}>Отмена</button>
        </dialog>
      )}
    </div>
  );
}

export default App;