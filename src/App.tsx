// frontend/src/App.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import './App.css';
import ImportProgram from './ImportProgram';

/* - типы - */
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

/* - адрес бэкенда в облаке - */
const API_URL = 'https://fittracker-backend-ptcq.onrender.com'; // УБРАЛ ПРОБЕЛ В КОНЦЕ!

function App() {
  /* - состояния - */
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [programs, setPrograms] = useState<ShortProgram[]>([]);
  const [editingProg, setEditingProg] = useState<WorkoutProgram | null>(null);
  const [history, setHistory] = useState<FinishedWorkout[]>([]);
  const [isPWA, setIsPWA] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [soundFile, setSoundFile] = useState<string>('beep.wav');
  const [startTime, setStartTime] = useState<number>(Date.now());

  /* - загрузка данных - */
  const loadExercises = async () => {
    try {
      const res = await axios.get<Exercise[]>(`${API_URL}/exercises`); // ИСПРАВИЛ АДРЕС
      setExercises(res.data);
    } catch (err) {
      console.error('Ошибка загрузки упражнений:', err);
    }
  };

  const loadPrograms = async () => {
    try {
      const res = await axios.get<ShortProgram[]>(`${API_URL}/programs`); // ИСПРАВИЛ АДРЕС
      setPrograms(res.data);
    } catch (err) {
      console.error('Ошибка загрузки программ:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await axios.get<FinishedWorkout[]>(`${API_URL}/workouts/history`); // ИСПРАВИЛ АДРЕС
      setHistory(res.data);
    } catch (err) {
      console.error('Ошибка загрузки истории:', err);
    }
  };

  /* - эффекты - */
  useEffect(() => {
    loadExercises();
    loadPrograms();
    loadHistory();
  }, []);

  useEffect(() => {
    // Таймер
    let interval: NodeJS.Timeout | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(s => s - 1);
      }, 1000);
    } else if (isActive && secondsLeft === 0) {
      setIsActive(false);
      const audio = new Audio(`/sounds/${soundFile}`);
      audio.play();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft, soundFile]);

  useEffect(() => {
    // PWA
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPWA(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  /* - обработчики - */
  const startTimer = (sec: number) => {
    setSecondsLeft(sec);
    setTotalSeconds(sec);
    setIsActive(true);
  };

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(0);
    setTotalSeconds(0);
  };

  const saveEdit = async () => {
    if (!editingProg) return;
    try {
      await axios.put(`${API_URL}/programs/${editingProg.id}`, editingProg); // ИСПРАВИЛ АДРЕС
      setEditingProg(null);
      loadPrograms();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
    }
  };

  const deleteProgram = async (id: number) => {
    if (!window.confirm('Удалить программу?')) return;
    try {
      await axios.delete(`${API_URL}/programs/${id}`); // ИСПРАВИЛ АДРЕС
      loadPrograms();
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

  const finishWorkout = async () => {
    if (!exercises.length) return;
    try {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const done = exercises.map(e => e.name);
      await axios.post(`${API_URL}/workouts/finish`, { // ИСПРАВИЛ АДРЕС
        finished_at: new Date().toISOString(),
        duration_sec: duration,
        exercises_done: done
      });
      loadHistory();
      resetTimer();
    } catch (err) {
      console.error('Ошибка завершения:', err);
    }
  };

  const exportHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/export-history`, { // ИСПРАВИЛ АДРЕС
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'history.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Ошибка экспорта:', err);
    }
  };

  const installPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setIsPWA(false);
        }
        setDeferredPrompt(null);
      });
    }
  };

  /* - расчёты для круга - */
  const percentage = totalSeconds ? Math.round((secondsLeft / totalSeconds) * 100) : 0;

  /* - рендер - */
  return (
    <div className="app-dark">
      <h1>Моя тренировка</h1>

      {/* Импорт программ */}
      <ImportProgram onImported={() => {
        loadPrograms();
        loadExercises();
      }} />
      <hr style={{ margin: '1rem 0' }} />

      {/* Кнопка установки PWA */}
      {isPWA && (
        <button onClick={installPWA} style={{ 
          background: '#4CAF50', 
          color: 'white', 
          border: 'none', 
          padding: '10px 20px', 
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          📲 Установить приложение
        </button>
      )}

      {/* Таймер */}
      <div style={{ width: 150, height: 150, margin: '0 auto 1rem' }}>
        <CircularProgressbar 
          value={percentage} 
          text={`${secondsLeft}s`}
          styles={buildStyles({
            textSize: '16px',
            pathColor: `rgba(62, 152, 199, ${isActive ? 1 : 0.5})`,
            textColor: '#fff',
            trailColor: '#222',
          })}
        />
      </div>

      {/* Управление таймером */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => startTimer(60)}>60s</button>
        <button onClick={() => startTimer(90)}>90s</button>
        <button onClick={() => startTimer(120)}>120s</button>
        <button onClick={() => startTimer(180)}>180s</button>
        <button onClick={resetTimer} style={{ background: '#f44336' }}>Стоп</button>
        <button onClick={finishWorkout} style={{ background: '#4CAF50' }}>🏁 Завершить</button>
      </div>

      {/* Выбор звука */}
      <label style={{ marginBottom: '1rem', display: 'block' }}>
        Звук таймера:
        <select 
          value={soundFile} 
          onChange={e => setSoundFile(e.target.value)}
          style={{ marginLeft: '0.5rem' }}
        >
          <option value="beep.wav">Бип</option>
          <option value="gong.wav">Гонг</option>
          <option value="voice.wav">Голос</option>
        </select>
      </label>

      {/* Список упражнений */}
      <h2>Упражнения</h2>
      <ul style={{ padding: 0 }}>
        {exercises.map(ex => (
          <li key={ex.id} style={{ 
            listStyle: 'none', 
            background: '#333', 
            margin: '0.5rem 0', 
            padding: '1rem', 
            borderRadius: '4px' 
          }}>
            <h3>{ex.name}</h3>
            {ex.tip && <p>💡 {ex.tip}</p>}
            <p>{ex.sets} подходов × {ex.reps} повторений {ex.weight ? `× ${ex.weight} кг` : ''}</p>
            {ex.yt_search && (
              <a 
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.yt_search)}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#4CAF50' }}
              >
                🎥 Посмотреть технику
              </a>
            )}
          </li>
        ))}
      </ul>

      {/* Список программ */}
      <h2>Программы тренировок</h2>
      <ul style={{ padding: 0 }}>
        {programs.map(p => (
          <li key={p.id} style={{ 
            listStyle: 'none', 
            background: '#333', 
            margin: '0.5rem 0', 
            padding: '1rem', 
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{p.title} ({p.ex_count})</span>
            <div>
              <button onClick={async () => {
                try {
                  const full = await axios.get<WorkoutProgram>(`${API_URL}/programs/${p.id}`); // ИСПРАВИЛ АДРЕС
                  setEditingProg(full.data);
                } catch (err) {
                  console.error('Ошибка загрузки программы:', err);
                }
              }}>✏️</button>
              <button onClick={() => deleteProgram(p.id)}>🗑️</button>
            </div>
          </li>
        ))}
      </ul>

      {/* История тренировок */}
      <h2>История тренировок</h2>
      <button onClick={exportHistory} style={{ marginBottom: '1rem' }}>📥 Экспорт в CSV</button>
      <ul style={{ padding: 0 }}>
        {history.map(w => (
          <li key={w.id} style={{ 
            listStyle: 'none', 
            background: '#333', 
            margin: '0.5rem 0', 
            padding: '1rem', 
            borderRadius: '4px' 
          }}>
            <p>🏁 Завершено: {new Date(w.finished_at).toLocaleString()}</p>
            <p>⏱️ Длительность: {w.duration_sec} сек</p>
            <p>💪 Упражнения: {w.exercises_done.join(', ')}</p>
          </li>
        ))}
      </ul>

      {/* Модальное окно редактирования */}
      {editingProg && (
        <dialog open style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          background: '#222',
          color: 'white',
          padding: '1rem',
          border: '1px solid #444',
          borderRadius: '4px',
          maxWidth: '90vw',
          width: '400px'
        }}>
          <h2>Редактировать программу</h2>
          <label>
            Название:
            <input 
              type="text" 
              value={editingProg.title}
              onChange={e => setEditingProg({ ...editingProg, title: e.target.value })}
              style={{ width: '100%', margin: '0.5rem 0' }}
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
                } catch {
                  // Игнорируем ошибки парсинга
                }
              }}
              rows={6}
              style={{ width: '100%', margin: '0.5rem 0' }}
            />
          </label>
          <br />
          <button onClick={saveEdit} style={{ background: '#4CAF50', color: 'white' }}>Сохранить</button>
          <button onClick={() => setEditingProg(null)} style={{ background: '#f44336', color: 'white', marginLeft: '0.5rem' }}>Отмена</button>
        </dialog>
      )}
    </div>
  );
}

export default App;