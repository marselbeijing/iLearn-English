// Основная логика приложения iLearn English
class iLearnEnglishApp {
    constructor() {
        this.currentScreen = 'loading-screen';
        this.currentLevel = null;
        this.currentLesson = null;
        this.currentExercise = 0;
        this.exercises = [];
        this.userProgress = this.loadProgress();
        this.lives = 3;
        this.correctAnswers = 0;
        this.lessonStartTime = null;
        
        // Настройки приложения
        this.settings = this.loadSettings();
        
        // Инициализируем тему
        this.initializeTheme();
        
        this.initializeTelegramWebApp();
        this.init();
    }

    // Безопасная функция для HapticFeedback
    triggerHaptic(type) {
        if (this.tg && this.tg.HapticFeedback && this.tg.version >= '6.1') {
            try {
                if (type === 'light' || type === 'medium' || type === 'heavy') {
                    this.tg.HapticFeedback.impactOccurred(type);
                } else if (type === 'success' || type === 'warning' || type === 'error') {
                    this.tg.HapticFeedback.notificationOccurred(type);
                }
            } catch (e) {
                // Игнорируем ошибки HapticFeedback
            }
        }
    }

    // Инициализация темы
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    }

    // Установка темы
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.updateThemeToggle(theme);
    }

    // Обновление переключателя темы
    updateThemeToggle(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.checked = theme === 'dark';
        }
    }

    // Переключение темы
    toggleTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        this.setTheme(newTheme);
        this.triggerHaptic('light');
    }

    // Навигация через нижний бар
    navigateToScreen(screenId) {
        this.playSound('click');
        this.triggerHaptic('light');
        
        // Обновляем активную кнопку
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.screen === screenId) {
                item.classList.add('active');
            }
        });

        // Показываем экран
        this.showScreen(screenId);

        // Обновляем данные для специальных экранов
        if (screenId === 'progress-screen') {
            this.updateProgressScreen();
        } else if (screenId === 'account-screen') {
            this.updateAccountScreen();
        }
    }

    // Обновление экрана прогресса
    updateProgressScreen() {
        // Обновляем общую статистику
        const totalXP = this.calculateTotalXP();
        const streakDays = this.calculateStreakDays();
        const completedLessons = this.calculateCompletedLessons();
        const learnedWords = this.calculateLearnedWords();

        document.getElementById('total-xp').textContent = totalXP;
        document.getElementById('streak-days').textContent = streakDays;
        document.getElementById('completed-lessons').textContent = completedLessons;
        document.getElementById('learned-words').textContent = learnedWords;

        // Обновляем прогресс по уровням
        this.updateLevelProgress();

        // Обновляем достижения
        this.updateAchievements();
    }

    // Расчет общего опыта
    calculateTotalXP() {
        let totalXP = 0;
        Object.values(this.userProgress).forEach(levelProgress => {
            Object.values(levelProgress).forEach(lessonProgress => {
                if (lessonProgress.completed) {
                    totalXP += lessonProgress.xp || 50;
                }
            });
        });
        return totalXP;
    }

    // Расчет серии дней
    calculateStreakDays() {
        // Простая реализация - можно расширить
        const completedLessons = this.calculateCompletedLessons();
        return Math.min(Math.floor(completedLessons / 3), 30);
    }

    // Расчет завершенных уроков
    calculateCompletedLessons() {
        let completed = 0;
        Object.values(this.userProgress).forEach(levelProgress => {
            Object.values(levelProgress).forEach(lessonProgress => {
                if (lessonProgress.completed) {
                    completed++;
                }
            });
        });
        return completed;
    }

    // Расчет изученных слов
    calculateLearnedWords() {
        const completedLessons = this.calculateCompletedLessons();
        return Math.floor(completedLessons * 8.5); // Примерно 8-9 слов за урок
    }

    // Обновление прогресса по уровням
    updateLevelProgress() {
        const levels = ['beginner', 'intermediate', 'advanced'];
        
        levels.forEach(level => {
            const levelData = this.levels[level];
            const progress = this.userProgress[level] || {};
            
            let completedCount = 0;
            Object.values(progress).forEach(lessonProgress => {
                if (lessonProgress.completed) {
                    completedCount++;
                }
            });

            const percentage = Math.floor((completedCount / levelData.totalLessons) * 100);
            
            const progressFill = document.getElementById(`${level}-progress`);
            const progressPercent = document.getElementById(`${level}-percent`);
            
            if (progressFill) {
                progressFill.style.width = `${percentage}%`;
            }
            if (progressPercent) {
                progressPercent.textContent = `${percentage}%`;
            }
        });
    }

    // Обновление достижений
    updateAchievements() {
        const completedLessons = this.calculateCompletedLessons();
        const streakDays = this.calculateStreakDays();
        const learnedWords = this.calculateLearnedWords();

        // Первый урок
        if (completedLessons >= 1) {
            document.getElementById('first-lesson')?.classList.add('unlocked');
        }

        // Неделя подряд
        if (streakDays >= 7) {
            document.getElementById('week-streak')?.classList.add('unlocked');
        }

        // 100 слов
        if (learnedWords >= 100) {
            document.getElementById('hundred-words')?.classList.add('unlocked');
        }

        // Завершение уровня
        const levels = ['beginner', 'intermediate', 'advanced'];
        const levelComplete = levels.some(level => {
            const levelData = this.levels[level];
            const progress = this.userProgress[level] || {};
            let completedCount = 0;
            Object.values(progress).forEach(lessonProgress => {
                if (lessonProgress.completed) {
                    completedCount++;
                }
            });
            return completedCount >= levelData.totalLessons;
        });

        if (levelComplete) {
            document.getElementById('level-complete')?.classList.add('unlocked');
        }
    }

    // Обновление экрана аккаунта
    updateAccountScreen() {
        // Обновляем информацию профиля
        const user = this.tg?.initDataUnsafe?.user;
        if (user) {
            document.getElementById('profile-name').textContent = user.first_name || 'Ученик';
            document.getElementById('profile-avatar').textContent = (user.first_name || 'У').charAt(0).toUpperCase();
        }

        // Определяем уровень пользователя
        const completedLessons = this.calculateCompletedLessons();
        let level = 'Начинающий';
        if (completedLessons >= 20) {
            level = 'Продвинутый';
        } else if (completedLessons >= 10) {
            level = 'Средний';
        }
        document.getElementById('profile-level').textContent = level;

        // Дни обучения
        const daysLearning = Math.max(1, this.calculateStreakDays());
        document.getElementById('days-learning').textContent = daysLearning;

        // Дата регистрации (сегодня для простоты)
        const today = new Date().toLocaleDateString('ru-RU');
        document.getElementById('registration-date').textContent = today;

        // Время в приложении (примерный расчет)
        const totalTime = completedLessons * 5; // 5 минут за урок
        document.getElementById('total-time').textContent = `${totalTime} мин`;

        // Лучшая серия
        const bestStreak = this.calculateStreakDays();
        document.getElementById('best-streak').textContent = `${bestStreak} дней`;
    }

    // Экспорт данных пользователя
    exportUserData() {
        const userData = {
            progress: this.userProgress,
            stats: {
                totalXP: this.calculateTotalXP(),
                completedLessons: this.calculateCompletedLessons(),
                learnedWords: this.calculateLearnedWords(),
                streakDays: this.calculateStreakDays()
            },
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(userData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ilearn-english-data.json';
        link.click();
        
        URL.revokeObjectURL(url);
        this.triggerHaptic('success');
    }

    // Удаление аккаунта
    deleteAccount() {
        if (confirm('Вы уверены, что хотите удалить все данные? Это действие необратимо.')) {
            localStorage.clear();
            this.userProgress = {};
            this.settings = this.getDefaultSettings();
            this.updateProgress();
            this.updateProgressScreen();
            this.updateSettingsUI();
            alert('Все данные удалены.');
            this.triggerHaptic('warning');
        }
    }

    // Загрузка настроек
    loadSettings() {
        const defaultSettings = this.getDefaultSettings();
        const savedSettings = localStorage.getItem('app-settings');
        
        if (savedSettings) {
            try {
                return { ...defaultSettings, ...JSON.parse(savedSettings) };
            } catch (e) {
                console.error('Ошибка загрузки настроек:', e);
                return defaultSettings;
            }
        }
        
        return defaultSettings;
    }

    // Настройки по умолчанию
    getDefaultSettings() {
        return {
            soundEnabled: true,
            hapticEnabled: true,
            notificationsEnabled: true,
            dailyGoal: 3,
            reminderTime: '20:00',
            difficulty: 'normal'
        };
    }

    // Сохранение настроек
    saveSettings() {
        try {
            localStorage.setItem('app-settings', JSON.stringify(this.settings));
        } catch (e) {
            console.error('Ошибка сохранения настроек:', e);
        }
    }

    // Обновление UI настроек
    updateSettingsUI() {
        const soundToggle = document.getElementById('sound-toggle');
        const hapticToggle = document.getElementById('haptic-toggle');
        const notificationsToggle = document.getElementById('notifications-toggle');

        if (soundToggle) soundToggle.checked = this.settings.soundEnabled;
        if (hapticToggle) hapticToggle.checked = this.settings.hapticEnabled;
        if (notificationsToggle) notificationsToggle.checked = this.settings.notificationsEnabled;
        
        // Обновляем переключатель темы
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.updateThemeToggle(savedTheme);
    }

    // Переключение звука
    toggleSound(enabled) {
        this.settings.soundEnabled = enabled;
        this.saveSettings();
        
        if (enabled) {
            this.playSound('success');
        }
        
        this.triggerHaptic('light');
        console.log('Звуковые эффекты:', enabled ? 'включены' : 'выключены');
    }

    // Переключение вибрации
    toggleHaptic(enabled) {
        this.settings.hapticEnabled = enabled;
        this.saveSettings();
        
        if (enabled) {
            this.triggerHaptic('medium');
        }
        
        console.log('Вибрация:', enabled ? 'включена' : 'выключена');
    }

    // Переключение уведомлений
    toggleNotifications(enabled) {
        this.settings.notificationsEnabled = enabled;
        this.saveSettings();
        
        if (enabled) {
            this.requestNotificationPermission();
        }
        
        this.triggerHaptic('light');
        console.log('Уведомления:', enabled ? 'включены' : 'выключены');
    }

    // Запрос разрешения на уведомления
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('Разрешение на уведомления:', permission);
                if (permission === 'granted') {
                    this.showNotification('Уведомления включены!', 'Теперь вы будете получать напоминания о занятиях');
                }
            });
        }
    }

    // Показ уведомления
    showNotification(title, body) {
        if (!this.settings.notificationsEnabled) return;
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="0.9em" font-size="90">📚</text></svg>',
                badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="0.9em" font-size="90">📚</text></svg>'
            });
        }
    }

    // Воспроизведение звука
    playSound(type) {
        if (!this.settings.soundEnabled) return;
        
        try {
            // Создаем простой звуковой сигнал
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Настройки для разных типов звуков
            switch (type) {
                case 'success':
                    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.3);
                    break;
                    
                case 'error':
                    oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.5);
                    break;
                    
                case 'click':
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.1);
                    break;
            }
        } catch (e) {
            console.log('Звук не поддерживается:', e);
        }
    }

    // Переопределяем triggerHaptic с учетом настроек
    triggerHaptic(type) {
        if (!this.settings.hapticEnabled) return;
        
        if (this.tg && this.tg.HapticFeedback && this.tg.version >= '6.1') {
            try {
                if (type === 'light' || type === 'medium' || type === 'heavy') {
                    this.tg.HapticFeedback.impactOccurred(type);
                } else if (type === 'success' || type === 'warning' || type === 'error') {
                    this.tg.HapticFeedback.notificationOccurred(type);
                }
            } catch (e) {
                // Игнорируем ошибки HapticFeedback
            }
        }
    }

    // Асинхронная инициализация
    async init() {
        await this.initializeData();
        this.bindEvents();
        this.updateSettingsUI();
        this.loadScreen();
    }

    // Инициализация Telegram WebApp
    initializeTelegramWebApp() {
        if (window.Telegram && window.Telegram.WebApp) {
            this.tg = window.Telegram.WebApp;
            this.tg.ready();
            this.tg.expand();
            
            // Устанавливаем основную кнопку
            this.tg.MainButton.hide();
            
            // Получаем данные пользователя
            const user = this.tg.initDataUnsafe?.user;
            if (user) {
                this.updateUserInfo(user);
            }
            
            // Принудительно устанавливаем светлую тему для лучшей видимости
            document.documentElement.setAttribute('data-theme', 'light');
            
            // Настройка темы на основе Telegram (отключено временно)
            // if (this.tg.colorScheme === 'dark') {
            //     document.documentElement.setAttribute('data-theme', 'dark');
            // } else {
            //     document.documentElement.setAttribute('data-theme', 'light');
            // }
            
            // Применяем цвета темы Telegram
            this.applyTelegramTheme();
            
            // Обработка изменения темы (отключено для стабильности)
            // this.tg.onEvent('themeChanged', () => {
            //     if (this.tg.colorScheme === 'dark') {
            //         document.documentElement.setAttribute('data-theme', 'dark');
            //     } else {
            //         document.documentElement.setAttribute('data-theme', 'light');
            //     }
            //     this.applyTelegramTheme();
            // });
            
            // Обработка кнопки "Назад"
            this.tg.onEvent('backButtonClicked', () => {
                this.handleBackButton();
            });
            
            // Настройка заголовков (только если поддерживается)
            if (this.tg.version >= '6.1') {
                this.tg.setHeaderColor('bg_color');
            }
            
            // Viewport height для мобильных
            const setVH = () => {
                const vh = this.tg.viewportHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
            };
            setVH();
            this.tg.onEvent('viewportChanged', setVH);
        }
    }

    // Обновление информации о пользователе
    updateUserInfo(user) {
        // Информация о пользователе теперь только в разделе "Аккаунт"
        // Обновляем только если находимся на экране аккаунта
        if (this.currentScreen === 'account-screen') {
            this.updateAccountScreen();
        }
    }

    // Применение темы Telegram
    applyTelegramTheme() {
        if (!this.tg) return;

        const root = document.documentElement;
        const themeParams = this.tg.themeParams;

        if (themeParams.bg_color) {
            root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
            root.style.setProperty('--bg-primary', themeParams.bg_color);
        }
        
        if (themeParams.text_color) {
            root.style.setProperty('--tg-theme-text-color', themeParams.text_color);
            root.style.setProperty('--text-primary', themeParams.text_color);
        }
        
        if (themeParams.hint_color) {
            root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color);
            root.style.setProperty('--text-secondary', themeParams.hint_color);
        }
        
        if (themeParams.link_color) {
            root.style.setProperty('--tg-theme-link-color', themeParams.link_color);
            root.style.setProperty('--primary-color', themeParams.link_color);
        }
        
        if (themeParams.button_color) {
            root.style.setProperty('--tg-theme-button-color', themeParams.button_color);
        }
        
        if (themeParams.button_text_color) {
            root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
        }
        
        if (themeParams.secondary_bg_color) {
            root.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color);
            root.style.setProperty('--bg-secondary', themeParams.secondary_bg_color);
            root.style.setProperty('--bg-card', themeParams.secondary_bg_color);
        }
    }

    // Обработка кнопки "Назад" Telegram
    handleBackButton() {
        if (this.currentScreen === 'exercise-screen') {
            this.showLessonsScreen();
        } else if (this.currentScreen === 'lessons-screen') {
            this.showScreen('home-screen');
        } else if (this.currentScreen === 'settings-screen') {
            this.showScreen('home-screen');
        } else {
            if (this.tg) {
                this.tg.close();
            }
        }
    }

    // Инициализация данных
    async initializeData() {
        try {
            // Загружаем данные из JSON файла
            const response = await fetch('data/lessons.json');
            const lessonsData = await response.json();
            
            this.levels = {
                beginner: {
                    name: lessonsData.beginner.name,
                    lessons: lessonsData.beginner.lessons,
                    totalLessons: lessonsData.beginner.totalLessons
                },
                intermediate: {
                    name: 'Средний', 
                    lessons: this.generateIntermediateLessons(),
                    totalLessons: 9
                },
                advanced: {
                    name: 'Продвинутый',
                    lessons: this.generateAdvancedLessons(),
                    totalLessons: 30
                }
            };
        } catch (error) {
            console.log('Не удалось загрузить данные из JSON, используем встроенные данные');
            // Fallback к встроенным данным
            this.levels = {
                beginner: {
                    name: 'Начальный',
                    lessons: this.generateBeginnerLessons(),
                    totalLessons: 20
                },
                intermediate: {
                    name: 'Средний', 
                    lessons: this.generateIntermediateLessons(),
                    totalLessons: 9
                },
                advanced: {
                    name: 'Продвинутый',
                    lessons: this.generateAdvancedLessons(),
                    totalLessons: 30
                }
            };
        }
    }

    // Генерация уроков для начального уровня
    generateBeginnerLessons() {
        return [
            {
                id: 1,
                title: 'Алфавит',
                exercises: [
                    {
                        type: 'multiple-choice',
                        question: 'Выберите правильную букву:',
                        questionText: 'A',
                        options: ['Эй', 'Би', 'Си', 'Ди'],
                        correct: 0
                    },
                    {
                        type: 'multiple-choice',
                        question: 'Какая буква идет после B?',
                        options: ['A', 'C', 'D', 'E'],
                        correct: 1
                    },
                    {
                        type: 'input',
                        question: 'Напишите первую букву английского алфавита:',
                        correct: 'A'
                    }
                ]
            },
            {
                id: 2,
                title: 'Числа 1-10',
                exercises: [
                    {
                        type: 'multiple-choice',
                        question: 'Как переводится "один"?',
                        options: ['two', 'one', 'three', 'four'],
                        correct: 1
                    },
                    {
                        type: 'multiple-choice',
                        question: 'Выберите правильный перевод "5":',
                        options: ['four', 'five', 'six', 'seven'],
                        correct: 1
                    },
                    {
                        type: 'input',
                        question: 'Напишите "десять" по-английски:',
                        correct: 'ten'
                    }
                ]
            },
            {
                id: 3,
                title: 'Приветствие',
                exercises: [
                    {
                        type: 'multiple-choice',
                        question: 'Как сказать "Привет" по-английски?',
                        options: ['Goodbye', 'Hello', 'Thanks', 'Sorry'],
                        correct: 1
                    },
                    {
                        type: 'multiple-choice',
                        question: 'Что означает "Good morning"?',
                        options: ['Доброй ночи', 'Добрый день', 'Доброе утро', 'До свидания'],
                        correct: 2
                    },
                    {
                        type: 'input',
                        question: 'Как ответить на "How are you?"',
                        correct: 'fine'
                    }
                ]
            },
            // Добавим больше уроков...
            ...Array.from({length: 17}, (_, i) => ({
                id: i + 4,
                title: `Урок ${i + 4}`,
                exercises: this.generateRandomExercises()
            }))
        ];
    }

    // Генерация уроков для среднего уровня
    generateIntermediateLessons() {
        return [
            {
                id: 1,
                title: "Past Simple",
                exercises: [
                    {
                        type: 'grammar-intro',
                        question: 'Изучаем Past Simple',
                        title: 'Past Simple (Простое прошедшее время)',
                        explanation: 'Past Simple используется для описания действий, которые произошли в прошлом.',
                        rule: 'Формула: I/You/We/They + глагол + ed\nHe/She/It + глагол + ed',
                        examples: [
                            { english: 'I worked yesterday', russian: 'Я работал вчера' },
                            { english: 'She studied English', russian: 'Она изучала английский' },
                            { english: 'We played football', russian: 'Мы играли в футбол' }
                        ]
                    },
                    {
                        type: 'grammar-practice',
                        question: 'Выберите правильную форму Past Simple:',
                        sentence: 'I ___ to school yesterday',
                        options: ['go', 'went', 'going', 'goes'],
                        correct: 1,
                        explanation: 'Past Simple от "go" - "went"'
                    },
                    {
                        type: 'grammar-complete',
                        question: 'Отлично! Вы изучили Past Simple',
                        description: 'Теперь вы знаете, как образуется и используется простое прошедшее время.',
                        achievement: '🎯 Past Simple освоен!'
                    }
                ]
            },
            {
                id: 2,
                title: "Профессии",
                exercises: [
                    {
                        type: 'vocabulary-intro',
                        question: 'Изучаем профессии',
                        title: 'Профессии (Professions)',
                        words: [
                            { word: 'doctor', pronunciation: '[ˈdɒktə]', translation: 'врач', emoji: '👨‍⚕️' },
                            { word: 'teacher', pronunciation: '[ˈtiːtʃə]', translation: 'учитель', emoji: '👨‍🏫' },
                            { word: 'engineer', pronunciation: '[ˌendʒɪˈnɪə]', translation: 'инженер', emoji: '👨‍💻' }
                        ]
                    },
                    {
                        type: 'vocabulary-match',
                        question: 'Сопоставьте профессии с переводом',
                        pairs: [
                            { english: 'doctor', russian: 'врач', emoji: '👨‍⚕️' },
                            { english: 'teacher', russian: 'учитель', emoji: '👨‍🏫' },
                            { english: 'engineer', russian: 'инженер', emoji: '👨‍💻' }
                        ]
                    },
                    {
                        type: 'vocabulary-complete',
                        question: 'Отлично! Вы изучили профессии',
                        description: 'Теперь вы знаете названия основных профессий на английском языке.',
                        achievement: '👔 Профессии изучены!'
                    }
                ]
            },
            {
                id: 3,
                title: "Present Continuous",
                exercises: [
                    {
                        type: 'grammar-intro',
                        question: 'Изучаем Present Continuous',
                        title: 'Present Continuous (Настоящее длительное время)',
                        explanation: 'Present Continuous используется для действий, происходящих сейчас.',
                        rule: 'Формула: am/is/are + глагол + ing',
                        examples: [
                            { english: 'I am reading now', russian: 'Я читаю сейчас' },
                            { english: 'She is working', russian: 'Она работает' },
                            { english: 'They are playing', russian: 'Они играют' }
                        ]
                    },
                    {
                        type: 'grammar-practice',
                        question: 'Выберите правильную форму Present Continuous:',
                        sentence: 'She ___ working now',
                        options: ['work', 'is working', 'works', 'worked'],
                        correct: 1,
                        explanation: 'Present Continuous: She is working'
                    },
                    {
                        type: 'grammar-complete',
                        question: 'Отлично! Вы изучили Present Continuous',
                        description: 'Теперь вы знаете, как описывать действия, происходящие в данный момент.',
                        achievement: '⏳ Present Continuous освоен!'
                    }
                ]
            },
            {
                id: 4,
                title: "Еда и напитки",
                exercises: [
                    {
                        type: 'vocabulary-intro',
                        question: 'Изучаем еду и напитки',
                        title: 'Еда и напитки (Food & Drinks)',
                        words: [
                            { word: 'breakfast', pronunciation: '[ˈbrekfəst]', translation: 'завтрак', emoji: '🥞' },
                            { word: 'coffee', pronunciation: '[ˈkɒfi]', translation: 'кофе', emoji: '☕' },
                            { word: 'sandwich', pronunciation: '[ˈsænwɪdʒ]', translation: 'сэндвич', emoji: '🥪' }
                        ]
                    },
                    {
                        type: 'vocabulary-match',
                        question: 'Сопоставьте еду с переводом',
                        pairs: [
                            { english: 'breakfast', russian: 'завтрак', emoji: '🥞' },
                            { english: 'coffee', russian: 'кофе', emoji: '☕' },
                            { english: 'sandwich', russian: 'сэндвич', emoji: '🥪' }
                        ]
                    },
                    {
                        type: 'vocabulary-complete',
                        question: 'Отлично! Вы изучили еду и напитки',
                        description: 'Теперь вы знаете основные слова о еде и напитках.',
                        achievement: '🍽️ Еда и напитки изучены!'
                    }
                ]
            },
            {
                id: 5,
                title: "Модальные глаголы",
                exercises: [
                    {
                        type: 'grammar-intro',
                        question: 'Изучаем модальные глаголы',
                        title: 'Модальные глаголы (Modal Verbs)',
                        explanation: 'Модальные глаголы выражают возможность, необходимость, разрешение.',
                        rule: 'can - могу/умею\nmust - должен\nmay - могу/можно',
                        examples: [
                            { english: 'I can swim', russian: 'Я умею плавать' },
                            { english: 'You must study', russian: 'Ты должен учиться' },
                            { english: 'May I come in?', russian: 'Можно войти?' }
                        ]
                    },
                    {
                        type: 'grammar-practice',
                        question: 'Выберите правильный модальный глагол:',
                        sentence: '___ you help me?',
                        options: ['Can', 'Must', 'Are', 'Do'],
                        correct: 0,
                        explanation: 'Can you help me? - Можешь помочь?'
                    },
                    {
                        type: 'grammar-complete',
                        question: 'Отлично! Вы изучили модальные глаголы',
                        description: 'Теперь вы знаете основные модальные глаголы и их значения.',
                        achievement: '🎭 Модальные глаголы освоены!'
                    }
                ]
            },
            {
                id: 6,
                title: "Путешествия",
                exercises: [
                    {
                        type: 'vocabulary-intro',
                        question: 'Изучаем слова о путешествиях',
                        title: 'Путешествия (Travel)',
                        words: [
                            { word: 'airport', pronunciation: '[ˈeəpɔːt]', translation: 'аэропорт', emoji: '✈️' },
                            { word: 'ticket', pronunciation: '[ˈtɪkɪt]', translation: 'билет', emoji: '🎫' },
                            { word: 'hotel', pronunciation: '[həʊˈtel]', translation: 'отель', emoji: '🏨' }
                        ]
                    },
                    {
                        type: 'vocabulary-match',
                        question: 'Сопоставьте слова о путешествиях',
                        pairs: [
                            { english: 'airport', russian: 'аэропорт', emoji: '✈️' },
                            { english: 'ticket', russian: 'билет', emoji: '🎫' },
                            { english: 'hotel', russian: 'отель', emoji: '🏨' }
                        ]
                    },
                    {
                        type: 'vocabulary-complete',
                        question: 'Отлично! Вы изучили слова о путешествиях',
                        description: 'Теперь вы знаете основные слова для путешествий.',
                        achievement: '🌍 Путешествия изучены!'
                    }
                ]
            },
            {
                id: 7,
                title: "Сравнительные степени",
                exercises: [
                    {
                        type: 'grammar-intro',
                        question: 'Изучаем сравнительные степени',
                        title: 'Сравнительные степени (Comparative)',
                        explanation: 'Сравнительные степени используются для сравнения предметов.',
                        rule: 'big → bigger → the biggest\ngood → better → the best',
                        examples: [
                            { english: 'This car is bigger', russian: 'Эта машина больше' },
                            { english: 'She is the best', russian: 'Она лучшая' },
                            { english: 'More interesting', russian: 'Более интересный' }
                        ]
                    },
                    {
                        type: 'grammar-practice',
                        question: 'Выберите правильную сравнительную степень:',
                        sentence: 'This book is ___ than that one',
                        options: ['good', 'better', 'best', 'more good'],
                        correct: 1,
                        explanation: 'better - сравнительная степень от good'
                    },
                    {
                        type: 'grammar-complete',
                        question: 'Отлично! Вы изучили сравнительные степени',
                        description: 'Теперь вы знаете, как сравнивать предметы на английском.',
                        achievement: '📊 Сравнительные степени освоены!'
                    }
                ]
            },
            {
                id: 8,
                title: "Предлоги места",
                exercises: [
                    {
                        type: 'grammar-intro',
                        question: 'Изучаем предлоги места',
                        title: 'Предлоги места (Prepositions of Place)',
                        explanation: 'Предлоги места показывают, где находится предмет.',
                        rule: 'in - в, внутри\non - на\nat - у, рядом\nnear - рядом',
                        examples: [
                            { english: 'The book is on the table', russian: 'Книга на столе' },
                            { english: 'I live in Moscow', russian: 'Я живу в Москве' },
                            { english: 'Meet me at the station', russian: 'Встретимся на станции' }
                        ]
                    },
                    {
                        type: 'grammar-practice',
                        question: 'Выберите правильный предлог:',
                        sentence: 'The cat is ___ the box',
                        options: ['in', 'on', 'at', 'near'],
                        correct: 0,
                        explanation: 'in the box - в коробке'
                    },
                    {
                        type: 'grammar-complete',
                        question: 'Отлично! Вы изучили предлоги места',
                        description: 'Теперь вы знаете основные предлоги места.',
                        achievement: '📍 Предлоги места освоены!'
                    }
                ]
            },
            {
                id: 9,
                title: "Итоговый тест",
                exercises: [
                    {
                        type: 'test-review',
                        question: 'Повторим изученное',
                        title: 'Итоговое повторение',
                        topics: [
                            { icon: '⏰', title: 'Past Simple', description: 'Простое прошедшее время' },
                            { icon: '👔', title: 'Профессии', description: 'Названия профессий' },
                            { icon: '⏳', title: 'Present Continuous', description: 'Длительное время' },
                            { icon: '🍽️', title: 'Еда и напитки', description: 'Слова о еде' },
                            { icon: '🎭', title: 'Модальные глаголы', description: 'Can, must, may' },
                            { icon: '🌍', title: 'Путешествия', description: 'Слова для поездок' },
                            { icon: '📊', title: 'Сравнения', description: 'Сравнительные степени' },
                            { icon: '📍', title: 'Предлоги', description: 'Предлоги места' }
                        ]
                    },
                    {
                        type: 'final-test',
                        question: 'Финальный тест среднего уровня',
                        description: 'Проверим ваши знания!',
                        achievement: '🏆 Средний уровень завершен!'
                    }
                ]
            }
        ];
    }

    // Генерация уроков для продвинутого уровня
    generateAdvancedLessons() {
        return [
            {
                id: 1,
                title: "Условные предложения",
                exercises: [
                    {
                        type: 'advanced-grammar-intro',
                        question: 'Изучаем условные предложения',
                        title: 'Условные предложения (Conditionals)',
                        explanation: 'Условные предложения выражают ситуации, которые могут произойти при определенных условиях.',
                        rule: 'First Conditional: If + Present Simple, will + Infinitive\nSecond Conditional: If + Past Simple, would + Infinitive\nThird Conditional: If + Past Perfect, would have + Past Participle',
                        examples: [
                            { english: 'If it rains, I will stay home', russian: 'Если будет дождь, я останусь дома', type: 'First Conditional' },
                            { english: 'If I had money, I would buy a car', russian: 'Если бы у меня были деньги, я бы купил машину', type: 'Second Conditional' },
                            { english: 'If I had studied, I would have passed', russian: 'Если бы я учился, я бы сдал экзамен', type: 'Third Conditional' }
                        ]
                    },
                    {
                        type: 'advanced-practice',
                        question: 'Выберите правильную форму условного предложения:',
                        sentence: 'If I ___ you, I would apologize',
                        options: ['am', 'was', 'were', 'had been'],
                        correct: 2,
                        explanation: 'Second Conditional: If I were you... (used for hypothetical situations)'
                    },
                    {
                        type: 'advanced-complete',
                        question: 'Отлично! Вы изучили условные предложения',
                        description: 'Теперь вы знаете, как выражать различные условия и гипотетические ситуации.',
                        achievement: '🎯 Conditionals освоены!'
                    }
                ]
            },
            {
                id: 2,
                title: "Деловой английский",
                exercises: [
                    {
                        type: 'advanced-vocabulary-intro',
                        question: 'Изучаем деловой английский',
                        title: 'Деловой английский (Business English)',
                        words: [
                            { word: 'meeting', pronunciation: '[ˈmiːtɪŋ]', translation: 'встреча/собрание', emoji: '🤝', context: 'We have a meeting at 3 PM' },
                            { word: 'presentation', pronunciation: '[ˌpreznˈteɪʃn]', translation: 'презентация', emoji: '📊', context: 'I need to prepare a presentation' },
                            { word: 'deadline', pronunciation: '[ˈdedlaɪn]', translation: 'крайний срок', emoji: '⏰', context: 'The deadline is tomorrow' }
                        ]
                    },
                    {
                        type: 'advanced-context-match',
                        question: 'Сопоставьте деловые фразы с ситуациями',
                        pairs: [
                            { phrase: 'Let\'s schedule a meeting', situation: 'Планируем встречу', emoji: '📅' },
                            { phrase: 'I need to meet the deadline', situation: 'Нужно успеть к сроку', emoji: '⏰' },
                            { phrase: 'Can you send me the report?', situation: 'Просим отчет', emoji: '📄' }
                        ]
                    },
                    {
                        type: 'advanced-complete',
                        question: 'Отлично! Вы изучили деловой английский',
                        description: 'Теперь вы знаете основную лексику для работы в офисе.',
                        achievement: '💼 Business English освоен!'
                    }
                ]
            },
            {
                id: 3,
                title: "Passive Voice",
                exercises: [
                    {
                        type: 'advanced-grammar-intro',
                        question: 'Изучаем пассивный залог',
                        title: 'Пассивный залог (Passive Voice)',
                        explanation: 'Пассивный залог используется, когда важно действие, а не тот, кто его выполняет.',
                        rule: 'Present: am/is/are + Past Participle\nPast: was/were + Past Participle\nFuture: will be + Past Participle',
                        examples: [
                            { english: 'The book is written by the author', russian: 'Книга написана автором', type: 'Present Passive' },
                            { english: 'The house was built in 1990', russian: 'Дом был построен в 1990 году', type: 'Past Passive' },
                            { english: 'The work will be finished tomorrow', russian: 'Работа будет закончена завтра', type: 'Future Passive' }
                        ]
                    },
                    {
                        type: 'advanced-practice',
                        question: 'Преобразуйте в пассивный залог:',
                        sentence: '"They built this bridge in 2010" →',
                        options: ['This bridge built in 2010', 'This bridge was built in 2010', 'This bridge is built in 2010', 'This bridge will be built in 2010'],
                        correct: 1,
                        explanation: 'Past Passive: was/were + Past Participle'
                    },
                    {
                        type: 'advanced-complete',
                        question: 'Отлично! Вы изучили пассивный залог',
                        description: 'Теперь вы знаете, как использовать пассивный залог в разных временах.',
                        achievement: '🔄 Passive Voice освоен!'
                    }
                ]
            },
            {
                id: 4,
                title: "Идиомы и фразеологизмы",
                exercises: [
                    {
                        type: 'advanced-idioms-intro',
                        question: 'Изучаем идиомы',
                        title: 'Идиомы и фразеологизмы (Idioms)',
                        idioms: [
                            { idiom: 'Break the ice', meaning: 'растопить лед, разрядить обстановку', emoji: '🧊', example: 'Tell a joke to break the ice' },
                            { idiom: 'Hit the books', meaning: 'заниматься, изучать', emoji: '📚', example: 'I need to hit the books for the exam' },
                            { idiom: 'Piece of cake', meaning: 'очень легко, проще простого', emoji: '🍰', example: 'This test was a piece of cake' }
                        ]
                    },
                    {
                        type: 'advanced-idioms-match',
                        question: 'Сопоставьте идиомы с их значениями',
                        pairs: [
                            { idiom: 'Break a leg', meaning: 'удачи, ни пуха ни пера', emoji: '🎭' },
                            { idiom: 'Spill the beans', meaning: 'выдать секрет', emoji: '🫘' },
                            { idiom: 'Cost an arm and a leg', meaning: 'очень дорого', emoji: '💰' }
                        ]
                    },
                    {
                        type: 'advanced-complete',
                        question: 'Отлично! Вы изучили идиомы',
                        description: 'Теперь ваша речь станет более естественной и выразительной.',
                        achievement: '🎭 Idioms освоены!'
                    }
                ]
            },
            {
                id: 5,
                title: "Reported Speech",
                exercises: [
                    {
                        type: 'advanced-grammar-intro',
                        question: 'Изучаем косвенную речь',
                        title: 'Косвенная речь (Reported Speech)',
                        explanation: 'Косвенная речь используется для передачи чужих слов без прямого цитирования.',
                        rule: 'Present → Past\nPast → Past Perfect\nWill → Would\nCan → Could',
                        examples: [
                            { english: 'He said: "I am tired" → He said he was tired', russian: 'Он сказал, что устал', type: 'Present → Past' },
                            { english: 'She said: "I will come" → She said she would come', russian: 'Она сказала, что придет', type: 'Will → Would' },
                            { english: 'They said: "We can help" → They said they could help', russian: 'Они сказали, что могут помочь', type: 'Can → Could' }
                        ]
                    },
                    {
                        type: 'advanced-practice',
                        question: 'Преобразуйте в косвенную речь:',
                        sentence: 'Tom said: "I am reading a book" →',
                        options: ['Tom said he reads a book', 'Tom said he was reading a book', 'Tom said he is reading a book', 'Tom said he read a book'],
                        correct: 1,
                        explanation: 'Present Continuous → Past Continuous: am reading → was reading'
                    },
                    {
                        type: 'advanced-complete',
                        question: 'Отлично! Вы изучили косвенную речь',
                        description: 'Теперь вы можете правильно передавать чужие слова.',
                        achievement: '💬 Reported Speech освоен!'
                    }
                ]
            },
            {
                id: 6,
                title: "Академический английский",
                exercises: [
                    {
                        type: 'advanced-vocabulary-intro',
                        question: 'Изучаем академический английский',
                        title: 'Академический английский (Academic English)',
                        words: [
                            { word: 'analyze', pronunciation: '[ˈænəlaɪz]', translation: 'анализировать', emoji: '🔍', context: 'We need to analyze the data' },
                            { word: 'hypothesis', pronunciation: '[haɪˈpɒθəsɪs]', translation: 'гипотеза', emoji: '💡', context: 'The hypothesis was proven correct' },
                            { word: 'methodology', pronunciation: '[ˌmeθəˈdɒlədʒi]', translation: 'методология', emoji: '📋', context: 'The research methodology is sound' }
                        ]
                    },
                    {
                        type: 'advanced-context-match',
                        question: 'Сопоставьте академические термины с определениями',
                        pairs: [
                            { phrase: 'Therefore', situation: 'Следовательно, поэтому', emoji: '➡️' },
                            { phrase: 'Furthermore', situation: 'Более того, кроме того', emoji: '➕' },
                            { phrase: 'In conclusion', situation: 'В заключение', emoji: '🏁' }
                        ]
                    },
                    {
                        type: 'advanced-complete',
                        question: 'Отлично! Вы изучили академический английский',
                        description: 'Теперь вы можете писать научные и академические тексты.',
                        achievement: '🎓 Academic English освоен!'
                    }
                ]
            },
            {
                id: 7,
                title: "Артикли в английском",
                exercises: [
                    {
                        type: 'advanced-grammar-intro',
                        question: 'Изучаем артикли',
                        title: 'Артикли (Articles): A, An, The',
                        explanation: 'Правильное использование артиклей - один из самых сложных аспектов английского языка.',
                        rule: 'A/An - неопределенный (первое упоминание)\nThe - определенный (конкретный предмет)\nNo article - общие понятия, абстрактные существительные',
                        examples: [
                            { english: 'I saw a cat. The cat was black.', russian: 'Я видел кота. Кот был черный.', type: 'A → The' },
                            { english: 'I love music (no article)', russian: 'Я люблю музыку', type: 'Abstract noun' },
                            { english: 'The sun rises in the east', russian: 'Солнце встает на востоке', type: 'Unique objects' }
                        ]
                    },
                    {
                        type: 'advanced-practice',
                        question: 'Выберите правильный артикль:',
                        sentence: 'I play ___ piano every day',
                        options: ['a', 'an', 'the', 'no article'],
                        correct: 2,
                        explanation: 'С музыкальными инструментами используется "the": play the piano, the guitar, etc.'
                    },
                    {
                        type: 'advanced-complete',
                        question: 'Отлично! Вы изучили артикли',
                        description: 'Теперь вы понимаете тонкости использования артиклей в английском языке.',
                        achievement: '📰 Articles освоены!'
                    }
                ]
            },
            {
                id: 8,
                title: "Фразовые глаголы",
                exercises: [
                    {
                        type: 'advanced-phrasal-intro',
                        question: 'Изучаем фразовые глаголы',
                        title: 'Фразовые глаголы (Phrasal Verbs)',
                        phrasals: [
                            { verb: 'give up', meaning: 'сдаваться, бросать', emoji: '🏳️', example: 'Don\'t give up your dreams', separable: false },
                            { verb: 'look after', meaning: 'заботиться о', emoji: '👶', example: 'Can you look after my cat?', separable: false },
                            { verb: 'turn on', meaning: 'включать', emoji: '💡', example: 'Turn on the light', separable: true }
                        ]
                    },
                    {
                        type: 'advanced-phrasal-match',
                        question: 'Сопоставьте фразовые глаголы с значениями',
                        pairs: [
                            { phrasal: 'break down', meaning: 'ломаться, переставать работать', emoji: '🚗' },
                            { phrasal: 'put off', meaning: 'откладывать', emoji: '📅' },
                            { phrasal: 'run out of', meaning: 'заканчиваться (о запасах)', emoji: '⛽' }
                        ]
                    },
                    {
                        type: 'advanced-complete',
                        question: 'Отлично! Вы изучили фразовые глаголы',
                        description: 'Фразовые глаголы делают вашу речь более естественной и идиоматичной.',
                        achievement: '🔗 Phrasal Verbs освоены!'
                    }
                ]
            },
            {
                id: 9,
                title: "Итоговый экзамен",
                exercises: [
                    {
                        type: 'advanced-review',
                        question: 'Повторим изученное на продвинутом уровне',
                        title: 'Итоговое повторение',
                        topics: [
                            { icon: '🎯', title: 'Conditionals', description: 'Условные предложения' },
                            { icon: '💼', title: 'Business English', description: 'Деловой английский' },
                            { icon: '🔄', title: 'Passive Voice', description: 'Пассивный залог' },
                            { icon: '🎭', title: 'Idioms', description: 'Идиомы и фразеологизмы' },
                            { icon: '💬', title: 'Reported Speech', description: 'Косвенная речь' },
                            { icon: '🎓', title: 'Academic English', description: 'Академический английский' },
                            { icon: '📰', title: 'Articles', description: 'Система артиклей' },
                            { icon: '🔗', title: 'Phrasal Verbs', description: 'Фразовые глаголы' }
                        ]
                    },
                    {
                        type: 'advanced-final-exam',
                        question: 'Финальный экзамен продвинутого уровня',
                        description: 'Проверим ваши знания на продвинутом уровне!',
                        achievement: '🏆 Продвинутый уровень завершен!'
                    }
                ]
            }
        ];
    }

    // Генерация случайных упражнений
    generateRandomExercises() {
        const exercises = [
            {
                type: 'multiple-choice',
                question: 'Выберите правильный вариант перевода:',
                options: ['вариант 1', 'вариант 2', 'вариант 3', 'вариант 4'],
                correct: Math.floor(Math.random() * 4)
            },
            {
                type: 'input',
                question: 'Переведите слово:',
                correct: 'answer'
            },
            {
                type: 'multiple-choice',
                question: 'Выберите правильную форму глагола:',
                options: ['is', 'are', 'am', 'be'],
                correct: Math.floor(Math.random() * 4)
            }
        ];
        
        return exercises.slice(0, Math.floor(Math.random() * 3) + 3);
    }

    // Привязка событий
    bindEvents() {
        // Кнопки навигации
        document.getElementById('lessons-back-btn')?.addEventListener('click', () => this.showScreen('home-screen'));
        document.getElementById('exercise-back-btn')?.addEventListener('click', () => this.showLessonsScreen());

        // Выбор уровня
        document.querySelectorAll('.level-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!card.classList.contains('locked')) {
                    this.selectLevel(card.dataset.level);
                }
            });
        });

        // Кнопка проверки
        document.getElementById('check-btn')?.addEventListener('click', () => this.checkAnswer());
        document.getElementById('continue-btn')?.addEventListener('click', () => this.continueLearning());

        // Настройки
        document.getElementById('reset-progress')?.addEventListener('click', () => this.resetProgress());
        document.getElementById('sound-toggle')?.addEventListener('change', (e) => this.toggleSound(e.target.checked));
        document.getElementById('haptic-toggle')?.addEventListener('change', (e) => this.toggleHaptic(e.target.checked));
        document.getElementById('notifications-toggle')?.addEventListener('change', (e) => this.toggleNotifications(e.target.checked));
        
        // Переключатель темы
        document.getElementById('theme-toggle')?.addEventListener('change', (e) => {
            this.toggleTheme();
        });

        // Нижняя навигация
        document.getElementById('bottom-nav')?.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                const screenId = navItem.dataset.screen;
                this.navigateToScreen(screenId);
            }
        });

        // Аккаунт функции
        document.getElementById('export-data')?.addEventListener('click', () => this.exportUserData());
        document.getElementById('delete-account')?.addEventListener('click', () => this.deleteAccount());
    }

    // Загрузка экрана
    loadScreen() {
        setTimeout(() => {
            this.showScreen('home-screen');
            this.updateProgress();
        }, 2000);
    }

    // Показ экрана
    showScreen(screenId) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.remove('active', 'prev');
            if (screen.id === this.currentScreen) {
                screen.classList.add('prev');
            }
        });

        setTimeout(() => {
            const newScreen = document.getElementById(screenId);
            if (newScreen) {
                newScreen.classList.add('active');
                this.currentScreen = screenId;
            }
        }, 100);

        // Haptic feedback
        if (this.tg && this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred('light');
        }
    }

    // Выбор уровня
    selectLevel(level) {
        this.currentLevel = level;
        this.showLessonsScreen();
    }

    // Показ экрана уроков
    showLessonsScreen() {
        if (!this.currentLevel) return;

        const levelData = this.levels[this.currentLevel];
        document.getElementById('level-title').textContent = levelData.name;
        
        const lessonsGrid = document.getElementById('lessons-grid');
        lessonsGrid.innerHTML = '';

        levelData.lessons.forEach((lesson, index) => {
            const lessonElement = document.createElement('div');
            lessonElement.className = 'lesson-item';
            lessonElement.dataset.lessonId = lesson.id;

            // Определяем статус урока (все уроки разблокированы для тестирования)
            const progress = this.userProgress[this.currentLevel] || {};
            if (progress[lesson.id]) {
                lessonElement.classList.add('completed');
            } else {
                lessonElement.classList.add('current');
            }

            lessonElement.innerHTML = `
                <div class="lesson-number">${lesson.id}</div>
                <div class="lesson-title">${lesson.title}</div>
            `;

            lessonElement.addEventListener('click', () => {
                this.startLesson(lesson);
            });

            lessonsGrid.appendChild(lessonElement);
        });

        this.showScreen('lessons-screen');
    }

    // Начало урока
    startLesson(lesson) {
        this.currentLesson = lesson;
        this.exercises = [...lesson.exercises];
        this.currentExercise = 0;
        this.lives = 3;
        this.correctAnswers = 0;
        this.lessonStartTime = Date.now();
        
        this.showExercise();
        this.showScreen('exercise-screen');
    }

    // Показ упражнения
    showExercise() {
        if (this.currentExercise >= this.exercises.length) {
            this.completeLesson();
            return;
        }

        const exercise = this.exercises[this.currentExercise];
        const content = document.getElementById('exercise-content');
        
        // Обновляем прогресс упражнения
        const progressFill = document.getElementById('exercise-progress-fill');
        const exerciseCount = document.getElementById('exercise-count');
        
        const progress = ((this.currentExercise + 1) / this.exercises.length) * 100;
        progressFill.style.width = `${progress}%`;
        exerciseCount.textContent = `${this.currentExercise + 1}/${this.exercises.length}`;

        // Генерируем содержимое упражнения
        if (exercise.type === 'alphabet-intro') {
            this.showAlphabetIntro(exercise, content);
        } else if (exercise.type === 'alphabet-quiz') {
            this.showAlphabetQuiz(exercise, content);
        } else if (exercise.type === 'alphabet-match') {
            this.showAlphabetMatch(exercise, content);
        } else if (exercise.type === 'alphabet-sequence') {
            this.showAlphabetSequence(exercise, content);
        } else if (exercise.type === 'alphabet-complete') {
            this.showAlphabetComplete(exercise, content);
        } else if (exercise.type === 'animal-intro') {
            this.showAnimalIntro(exercise, content);
        } else if (exercise.type === 'animal-quiz') {
            this.showAnimalQuiz(exercise, content);
        } else if (exercise.type === 'animal-match') {
            this.showAnimalMatch(exercise, content);
        } else if (exercise.type === 'animal-complete') {
            this.showAnimalComplete(exercise, content);
        } else if (exercise.type === 'fruit-intro') {
            this.showFruitIntro(exercise, content);
        } else if (exercise.type === 'fruit-quiz') {
            this.showFruitQuiz(exercise, content);
        } else if (exercise.type === 'fruit-match') {
            this.showFruitMatch(exercise, content);
        } else if (exercise.type === 'fruit-complete') {
            this.showFruitComplete(exercise, content);
        } else if (exercise.type === 'number-intro') {
            this.showNumberIntro(exercise, content);
        } else if (exercise.type === 'number-quiz') {
            this.showNumberQuiz(exercise, content);
        } else if (exercise.type === 'number-match') {
            this.showNumberMatch(exercise, content);
        } else if (exercise.type === 'number-complete') {
            this.showNumberComplete(exercise, content);
        } else if (exercise.type === 'greetings-intro') {
            this.showGreetingsIntro(exercise, content);
        } else if (exercise.type === 'greetings-quiz') {
            this.showGreetingsQuiz(exercise, content);
        } else if (exercise.type === 'greetings-match') {
            this.showGreetingsMatch(exercise, content);
        } else if (exercise.type === 'greetings-complete') {
            this.showGreetingsComplete(exercise, content);
        } else if (exercise.type === 'family-intro') {
            this.showFamilyIntro(exercise, content);
        } else if (exercise.type === 'family-quiz') {
            this.showFamilyQuiz(exercise, content);
        } else if (exercise.type === 'family-match') {
            this.showFamilyMatch(exercise, content);
        } else if (exercise.type === 'family-complete') {
            this.showFamilyComplete(exercise, content);
        } else if (exercise.type === 'colors-intro') {
            this.showColorsIntro(exercise, content);
        } else if (exercise.type === 'colors-quiz') {
            this.showColorsQuiz(exercise, content);
        } else if (exercise.type === 'colors-match') {
            this.showColorsMatch(exercise, content);
        } else if (exercise.type === 'colors-complete') {
            this.showColorsComplete(exercise, content);
        } else if (exercise.type === 'body-intro') {
            this.showBodyIntro(exercise, content);
        } else if (exercise.type === 'body-quiz') {
            this.showBodyQuiz(exercise, content);
        } else if (exercise.type === 'body-match') {
            this.showBodyMatch(exercise, content);
        } else if (exercise.type === 'body-complete') {
            this.showBodyComplete(exercise, content);
        } else if (exercise.type === 'test-start') {
            this.showTestStart(exercise, content);
        } else if (exercise.type === 'grammar-intro') {
            this.showGrammarIntro(exercise, content);
        } else if (exercise.type === 'grammar-practice') {
            this.showGrammarPractice(exercise, content);
        } else if (exercise.type === 'grammar-complete') {
            this.showGrammarComplete(exercise, content);
        } else if (exercise.type === 'vocabulary-intro') {
            this.showVocabularyIntro(exercise, content);
        } else if (exercise.type === 'vocabulary-match') {
            this.showVocabularyMatch(exercise, content);
        } else if (exercise.type === 'vocabulary-complete') {
            this.showVocabularyComplete(exercise, content);
        } else if (exercise.type === 'test-review') {
            this.showTestReview(exercise, content);
        } else if (exercise.type === 'final-test') {
            this.showFinalTest(exercise, content);
        } else if (exercise.type === 'advanced-grammar-intro') {
            this.showAdvancedGrammarIntro(exercise, content);
        } else if (exercise.type === 'advanced-practice') {
            this.showAdvancedPractice(exercise, content);
        } else if (exercise.type === 'advanced-vocabulary-intro') {
            this.showAdvancedVocabularyIntro(exercise, content);
        } else if (exercise.type === 'advanced-context-match') {
            this.showAdvancedContextMatch(exercise, content);
        } else if (exercise.type === 'advanced-complete') {
            this.showAdvancedComplete(exercise, content);
        } else if (exercise.type === 'advanced-review') {
            this.showAdvancedReview(exercise, content);
        } else if (exercise.type === 'advanced-final-exam') {
            this.showAdvancedFinalExam(exercise, content);
        } else if (exercise.type === 'multiple-choice') {
            content.innerHTML = `
                <div class="question">${exercise.question}</div>
                ${exercise.questionText ? `<div class="question-text">${exercise.questionText}</div>` : ''}
                <div class="options">
                    ${exercise.options.map((option, index) => `
                        <button class="option" data-index="${index}">${option}</button>
                    `).join('')}
                </div>
            `;

            // Привязываем события к опциям
            content.querySelectorAll('.option').forEach(option => {
                option.addEventListener('click', () => {
                    content.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                    document.getElementById('check-btn').disabled = false;
                });
            });
        } else if (exercise.type === 'input') {
            content.innerHTML = `
                <div class="question">${exercise.question}</div>
                <input type="text" class="input-answer" placeholder="Введите ответ...">
            `;

            const input = content.querySelector('.input-answer');
            input.addEventListener('input', () => {
                document.getElementById('check-btn').disabled = input.value.trim() === '';
            });
        }

        if (!exercise.type.startsWith('alphabet-intro') && !exercise.type.startsWith('alphabet-complete') && 
            !exercise.type.startsWith('animal-intro') && !exercise.type.startsWith('animal-complete') &&
            !exercise.type.startsWith('fruit-intro') && !exercise.type.startsWith('fruit-complete') &&
            !exercise.type.startsWith('number-intro') && !exercise.type.startsWith('number-complete') &&
            !exercise.type.startsWith('greetings-intro') && !exercise.type.startsWith('greetings-complete') &&
            !exercise.type.startsWith('family-intro') && !exercise.type.startsWith('family-complete') &&
            !exercise.type.startsWith('colors-intro') && !exercise.type.startsWith('colors-complete') &&
            !exercise.type.startsWith('body-intro') && !exercise.type.startsWith('body-complete') &&
            !exercise.type.startsWith('test-start') && !exercise.type.startsWith('grammar-intro') &&
            !exercise.type.startsWith('grammar-complete') && !exercise.type.startsWith('vocabulary-intro') &&
            !exercise.type.startsWith('vocabulary-complete') && !exercise.type.startsWith('test-review') &&
            !exercise.type.startsWith('final-test') && !exercise.type.startsWith('advanced-grammar-intro') &&
            !exercise.type.startsWith('advanced-vocabulary-intro') && !exercise.type.startsWith('advanced-context-match') &&
            !exercise.type.startsWith('advanced-complete') && !exercise.type.startsWith('advanced-review') &&
            !exercise.type.startsWith('advanced-final-exam')) {
            document.getElementById('check-btn').disabled = true;
        }
        document.getElementById('check-btn').textContent = 'Проверить';
    }

    // Показ введения буквы алфавита
    showAlphabetIntro(exercise, content) {
        content.innerHTML = `
            <div class="alphabet-card alphabet-intro-animation">
                <div class="question">${exercise.question}</div>
                ${exercise.emoji ? `<div class="alphabet-emoji">${exercise.emoji}</div>` : ''}
                <div class="alphabet-letter" data-letter="${exercise.letter}">${exercise.letter}</div>
                <div class="alphabet-pronunciation">${exercise.pronunciation}</div>
                <div class="alphabet-example">${exercise.example}</div>
                <button class="alphabet-sound-btn" title="Прослушать произношение">🔊</button>
                <button class="alphabet-next-btn">Понятно! Далее</button>
            </div>
        `;

        // Звуковые эффекты (заглушка)
        const soundBtn = content.querySelector('.alphabet-sound-btn');
        const letter = content.querySelector('.alphabet-letter');
        const emoji = content.querySelector('.alphabet-emoji');
        
        soundBtn.addEventListener('click', () => {
            this.playLetterSound(exercise.letter, exercise.sound);
            letter.style.animation = 'none';
            setTimeout(() => letter.style.animation = 'letterPulse 2s ease-in-out infinite', 10);
        });

        letter.addEventListener('click', () => {
            this.playLetterSound(exercise.letter, exercise.sound);
        });

        if (emoji) {
            emoji.addEventListener('click', () => {
                this.playLetterSound(exercise.letter, exercise.sound);
                emoji.style.animation = 'none';
                setTimeout(() => emoji.style.animation = 'emojiPulse 2s ease-in-out infinite', 10);
            });
        }

        const nextBtn = content.querySelector('.alphabet-next-btn');
        nextBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Показ викторины по алфавиту
    showAlphabetQuiz(exercise, content) {
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            ${exercise.letter ? `<div class="alphabet-letter" style="font-size: 3rem; margin: 1rem 0;">${exercise.letter}</div>` : ''}
            <div class="options">
                ${exercise.options.map((option, index) => `
                    <button class="option" data-index="${index}">${option}</button>
                `).join('')}
            </div>
        `;

        content.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', () => {
                content.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                document.getElementById('check-btn').disabled = false;
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ сопоставления букв
    showAlphabetMatch(exercise, content) {
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="alphabet-matching">
                ${exercise.pairs.map((pair, index) => `
                    <div class="match-pair" data-index="${index}">
                        <div class="match-letter">${pair.letter}</div>
                        <div class="match-example">${pair.example}</div>
                    </div>
                `).join('')}
            </div>
        `;

        // Автоматически считаем правильным
        setTimeout(() => {
            content.querySelectorAll('.match-pair').forEach(pair => {
                pair.classList.add('correct');
            });
            document.getElementById('check-btn').disabled = false;
            document.getElementById('check-btn').textContent = 'Продолжить';
        }, 2000);

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ последовательности букв
    showAlphabetSequence(exercise, content) {
        this.sequenceAnswer = [];
        
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="sequence-drop-zone" id="sequence-drop-zone">
                ${exercise.correct.map((_, index) => `
                    <div class="sequence-slot" data-position="${index}"></div>
                `).join('')}
            </div>
            <div class="sequence-container">
                ${exercise.letters.map((letter, index) => `
                    <div class="sequence-letter" data-letter="${letter}" data-index="${index}">${letter}</div>
                `).join('')}
            </div>
        `;

        // Привязываем события
        content.querySelectorAll('.sequence-letter').forEach(letter => {
            letter.addEventListener('click', () => {
                if (letter.classList.contains('selected')) return;
                
                const emptySlot = content.querySelector('.sequence-slot:not(.filled)');
                if (emptySlot) {
                    emptySlot.textContent = letter.textContent;
                    emptySlot.classList.add('filled');
                    emptySlot.dataset.letter = letter.dataset.letter;
                    letter.classList.add('selected');
                    
                    this.sequenceAnswer.push(letter.dataset.letter);
                    
                    if (this.sequenceAnswer.length === exercise.correct.length) {
                        document.getElementById('check-btn').disabled = false;
                    }
                }
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ завершения алфавита
    showAlphabetComplete(exercise, content) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        
        content.innerHTML = `
            <div class="alphabet-complete">
                <div class="alphabet-complete-icon">🎉</div>
                <h2>${exercise.question}</h2>
                <p>${exercise.description}</p>
                <div class="alphabet-progress-visual">
                    ${alphabet.map(letter => `
                        <div class="progress-letter learned">${letter}</div>
                    `).join('')}
                </div>
                <button class="alphabet-next-btn">Завершить урок</button>
            </div>
        `;

        // Анимация появления букв
        const letters = content.querySelectorAll('.progress-letter');
        letters.forEach((letter, index) => {
            setTimeout(() => {
                letter.style.animation = 'letterLearned 0.5s ease-out';
            }, index * 100);
        });

        const nextBtn = content.querySelector('.alphabet-next-btn');
        nextBtn.addEventListener('click', () => {
            this.completeLesson();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Воспроизведение звука буквы (заглушка)
    playLetterSound(letter, soundFile) {
        // Пока используем Speech Synthesis API как замену
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(letter);
            utterance.lang = 'en-US';
            utterance.rate = 0.7;
            utterance.pitch = 1.2;
            speechSynthesis.speak(utterance);
        }
        
        // В будущем здесь будет загрузка и воспроизведение аудио файла
        // const audio = new Audio(soundFile);
        // audio.play();
        
        if (this.tg && this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred('light');
        }
    }

    // Проверка ответа
    checkAnswer() {
        const exercise = this.exercises[this.currentExercise];
        const content = document.getElementById('exercise-content');
        let isCorrect = false;

        if (exercise.type === 'alphabet-quiz' || exercise.type === 'multiple-choice') {
            const selectedOption = content.querySelector('.option.selected');
            if (selectedOption) {
                const selectedIndex = parseInt(selectedOption.dataset.index);
                isCorrect = selectedIndex === exercise.correct;
                
                // Показываем правильный/неправильный ответ
                content.querySelectorAll('.option').forEach((option, index) => {
                    if (index === exercise.correct) {
                        option.classList.add('correct');
                    } else if (option.classList.contains('selected') && !isCorrect) {
                        option.classList.add('incorrect');
                    }
                });
            }
        } else if (exercise.type === 'alphabet-sequence') {
            isCorrect = this.sequenceAnswer.join('') === exercise.correct.join('');
            
            // Показываем результат
            content.querySelectorAll('.sequence-slot').forEach((slot, index) => {
                if (slot.dataset.letter === exercise.correct[index]) {
                    slot.classList.add('correct');
                } else {
                    slot.classList.add('incorrect');
                }
            });
        } else if (exercise.type === 'alphabet-match') {
            // Для сопоставления всегда правильный ответ
            isCorrect = true;
        } else if (exercise.type === 'greetings-quiz') {
            const selectedOption = content.querySelector('.option.selected');
            if (selectedOption) {
                const selectedIndex = parseInt(selectedOption.dataset.index);
                isCorrect = selectedIndex === exercise.correct;
                
                // Показываем правильный/неправильный ответ
                content.querySelectorAll('.option').forEach((option, index) => {
                    if (index === exercise.correct) {
                        option.classList.add('correct');
                    } else if (option.classList.contains('selected') && !isCorrect) {
                        option.classList.add('incorrect');
                    }
                });
            }
        } else if (exercise.type === 'greetings-match') {
            // Проверяем, что все пары сопоставлены правильно
            isCorrect = this.selectedAnswer.length === exercise.pairs.length;
        } else if (exercise.type === 'family-quiz') {
            const selectedOption = content.querySelector('.option.selected');
            if (selectedOption) {
                const selectedIndex = parseInt(selectedOption.dataset.index);
                isCorrect = selectedIndex === exercise.correct;
                
                // Показываем правильный/неправильный ответ
                content.querySelectorAll('.option').forEach((option, index) => {
                    if (index === exercise.correct) {
                        option.classList.add('correct');
                    } else if (option.classList.contains('selected') && !isCorrect) {
                        option.classList.add('incorrect');
                    }
                });
            }
        } else if (exercise.type === 'family-match') {
            // Проверяем, что все пары сопоставлены правильно
            isCorrect = this.selectedAnswer.length === exercise.pairs.length;
        } else if (exercise.type === 'colors-quiz') {
            const selectedOption = content.querySelector('.option.selected');
            if (selectedOption) {
                const selectedIndex = parseInt(selectedOption.dataset.index);
                isCorrect = selectedIndex === exercise.correct;
                
                // Показываем правильный/неправильный ответ
                content.querySelectorAll('.option').forEach((option, index) => {
                    if (index === exercise.correct) {
                        option.classList.add('correct');
                    } else if (option.classList.contains('selected') && !isCorrect) {
                        option.classList.add('incorrect');
                    }
                });
            }
        } else if (exercise.type === 'colors-match') {
            // Проверяем, что все пары сопоставлены правильно
            isCorrect = this.selectedAnswer.length === exercise.pairs.length;
        } else if (exercise.type === 'body-quiz') {
            const selectedOption = content.querySelector('.option.selected');
            if (selectedOption) {
                const selectedIndex = parseInt(selectedOption.dataset.index);
                isCorrect = selectedIndex === exercise.correct;
                
                // Показываем правильный/неправильный ответ
                content.querySelectorAll('.option').forEach((option, index) => {
                    if (index === exercise.correct) {
                        option.classList.add('correct');
                    } else if (option.classList.contains('selected') && !isCorrect) {
                        option.classList.add('incorrect');
                    }
                });
            }
        } else if (exercise.type === 'body-match') {
            // Проверяем, что все пары сопоставлены правильно
            isCorrect = this.selectedAnswer.length === exercise.pairs.length;
        } else if (exercise.type === 'advanced-practice') {
            if (this.selectedOption !== undefined) {
                isCorrect = this.selectedOption === exercise.correct;
                
                // Показываем объяснение
                const explanationBox = document.getElementById('explanation-box');
                if (explanationBox) {
                    explanationBox.style.display = 'block';
                }
                
                // Показываем правильный/неправильный ответ
                const options = content.querySelectorAll('.advanced-option');
                options.forEach((option, index) => {
                    if (index === exercise.correct) {
                        option.classList.add('correct');
                        option.style.background = '#d4edda';
                        option.style.borderColor = '#28a745';
                    } else if (index === this.selectedOption && !isCorrect) {
                        option.classList.add('incorrect');
                        option.style.background = '#f8d7da';
                        option.style.borderColor = '#dc3545';
                    }
                });
            }
        } else if (exercise.type === 'input') {
            const input = content.querySelector('.input-answer');
            const userAnswer = input.value.trim().toLowerCase();
            
            // Поддержка массива правильных ответов
            if (Array.isArray(exercise.correct)) {
                isCorrect = exercise.correct.some(answer => 
                    userAnswer === answer.toLowerCase()
                );
            } else {
                isCorrect = userAnswer === exercise.correct.toLowerCase();
            }
            
            if (isCorrect) {
                input.style.borderColor = 'var(--success-color)';
                input.style.backgroundColor = '#d4edda';
            } else {
                input.style.borderColor = 'var(--error-color)';
                input.style.backgroundColor = '#f8d7da';
            }
        }

        if (isCorrect) {
            this.correctAnswers++;
            this.playSound('success');
            this.triggerHaptic('success');
        } else {
            this.lives--;
            this.updateLives();
            this.playSound('error');
            this.triggerHaptic('error');
        }

        // Показываем объяснение если есть
        if (exercise.explanation) {
            setTimeout(() => {
                const explanation = document.createElement('div');
                explanation.className = 'explanation';
                explanation.style.cssText = `
                    background: #f8f9fa;
                    border-left: 4px solid var(--primary-color);
                    padding: 1rem;
                    margin-top: 1rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                `;
                explanation.innerHTML = `💡 ${exercise.explanation}`;
                content.appendChild(explanation);
            }, 500);
        }

        document.getElementById('check-btn').textContent = 'Продолжить';
        document.getElementById('check-btn').onclick = () => this.nextExercise();
    }

    // Следующее упражнение
    nextExercise() {
        this.currentExercise++;
        document.getElementById('check-btn').onclick = () => this.checkAnswer();
        this.showExercise();
    }

    // Обновление жизней
    updateLives() {
        const hearts = document.querySelectorAll('.heart');
        hearts.forEach((heart, index) => {
            if (index >= this.lives) {
                heart.classList.add('lost');
            }
        });
    }

    // Завершение урока
    completeLesson() {
        const lessonTime = Math.floor((Date.now() - this.lessonStartTime) / 1000);
        const minutes = Math.floor(lessonTime / 60);
        const seconds = lessonTime % 60;
        
        // Обновляем прогресс
        if (!this.userProgress[this.currentLevel]) {
            this.userProgress[this.currentLevel] = {};
        }
        this.userProgress[this.currentLevel][this.currentLesson.id] = true;
        
        // Добавляем опыт
        const earnedXP = this.correctAnswers * 10;
        this.userProgress.totalXP = (this.userProgress.totalXP || 0) + earnedXP;
        
        this.saveProgress();

        // Показываем результаты
        document.getElementById('correct-answers').textContent = this.correctAnswers;
        document.getElementById('earned-xp').textContent = `+${earnedXP}`;
        document.getElementById('lesson-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        this.showScreen('results-screen');
    }

    // Продолжение обучения
    continueLearning() {
        this.showLessonsScreen();
        this.updateProgress();
    }

    // Обновление прогресса
    updateProgress() {
        // Обновляем XP и streak
        document.getElementById('user-xp').textContent = this.userProgress.totalXP || 0;
        document.getElementById('user-streak').textContent = this.userProgress.streak || 0;

        // Обновляем общий прогресс
        const totalLessons = Object.values(this.levels).reduce((sum, level) => sum + level.totalLessons, 0);
        const completedLessons = Object.values(this.userProgress).reduce((sum, levelProgress) => {
            if (typeof levelProgress === 'object') {
                return sum + Object.keys(levelProgress).length;
            }
            return sum;
        }, 0);
        
        const overallProgress = Math.floor((completedLessons / totalLessons) * 100);
        document.getElementById('overall-progress').style.width = `${overallProgress}%`;
        document.getElementById('progress-text').textContent = `${overallProgress}%`;

        // Обновляем прогресс уровней
        Object.keys(this.levels).forEach(levelKey => {
            const levelProgress = this.userProgress[levelKey] || {};
            const completedCount = Object.keys(levelProgress).length;
            const totalCount = this.levels[levelKey].totalLessons;
            const percentage = Math.floor((completedCount / totalCount) * 100);
            
            const card = document.querySelector(`.level-card.${levelKey}`);
            if (card) {
                const progressFill = card.querySelector('.level-progress-fill');
                const progressText = card.querySelector('.level-progress-text');
                
                if (progressFill) progressFill.style.width = `${percentage}%`;
                if (progressText) progressText.textContent = `${completedCount}/${totalCount}`;
                
                // Разблокируем следующий уровень
                if (levelKey === 'intermediate') {
                    // Средний уровень всегда разблокирован
                    card.classList.remove('locked');
                } else if (levelKey === 'advanced') {
                    // Продвинутый уровень всегда разблокирован
                    card.classList.remove('locked');
                }
            }
        });

        // Обновляем ежедневную цель
        const dailyGoal = this.userProgress.dailyGoal || 0;
        const dailyGoalProgress = Math.min((dailyGoal / 3) * 100, 100);
        document.getElementById('daily-goal-fill').style.width = `${dailyGoalProgress}%`;
    }

    // Сброс прогресса
    resetProgress() {
        if (confirm('Вы уверены, что хотите сбросить весь прогресс?')) {
            localStorage.removeItem('ilearn-progress');
            this.userProgress = {};
            this.updateProgress();
            location.reload();
        }
    }

    // Загрузка прогресса
    loadProgress() {
        const saved = localStorage.getItem('ilearn-progress');
        return saved ? JSON.parse(saved) : {
            totalXP: 0,
            streak: 0,
            dailyGoal: 0
        };
    }

    // Сохранение прогресса
    saveProgress() {
        localStorage.setItem('ilearn-progress', JSON.stringify(this.userProgress));
    }

    // Показ введения животного
    showAnimalIntro(exercise, content) {
        content.innerHTML = `
            <div class="animal-card animal-intro-animation">
                <div class="question">${exercise.question}</div>
                <div class="animal-emoji" data-animal="${exercise.animal}">${exercise.animal}</div>
                <div class="animal-word">${exercise.word}</div>
                <div class="animal-pronunciation">${exercise.pronunciation}</div>
                <div class="animal-translation">${exercise.translation}</div>
                <button class="animal-sound-btn" title="Прослушать произношение">🔊</button>
                <button class="animal-next-btn">Понятно! Далее</button>
            </div>
        `;

        const soundBtn = content.querySelector('.animal-sound-btn');
        const animalEmoji = content.querySelector('.animal-emoji');
        
        soundBtn.addEventListener('click', () => {
            this.playAnimalSound(exercise.word, exercise.sound);
            animalEmoji.style.animation = 'none';
            setTimeout(() => animalEmoji.style.animation = 'animalPulse 2s ease-in-out infinite', 10);
        });

        animalEmoji.addEventListener('click', () => {
            this.playAnimalSound(exercise.word, exercise.sound);
        });

        const nextBtn = content.querySelector('.animal-next-btn');
        nextBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Показ викторины по животным
    showAnimalQuiz(exercise, content) {
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="animal-emoji" style="font-size: 6rem; margin: 2rem 0;">${exercise.animal}</div>
            <div class="options">
                ${exercise.options.map((option, index) => `
                    <button class="option" data-index="${index}">${option}</button>
                `).join('')}
            </div>
        `;

        content.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', () => {
                content.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                document.getElementById('check-btn').disabled = false;
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ сопоставления животных
    showAnimalMatch(exercise, content) {
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="animal-matching">
                ${exercise.pairs.map((pair, index) => `
                    <div class="match-pair" data-index="${index}">
                        <div class="match-animal">${pair.animal}</div>
                        <div class="match-word">${pair.word}</div>
                    </div>
                `).join('')}
            </div>
        `;

        setTimeout(() => {
            content.querySelectorAll('.match-pair').forEach(pair => {
                pair.classList.add('correct');
            });
            document.getElementById('check-btn').disabled = false;
            document.getElementById('check-btn').textContent = 'Продолжить';
        }, 2000);

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ завершения изучения животных
    showAnimalComplete(exercise, content) {
        const animals = ['🐱', '🐶', '🐦', '🐘', '🐎', '🐠', '🐭', '🦁'];
        
        content.innerHTML = `
            <div class="animal-complete">
                <div class="animal-complete-icon">🎉</div>
                <h2>${exercise.question}</h2>
                <p>${exercise.description}</p>
                <div class="animal-progress-visual">
                    ${animals.map(animal => `
                        <div class="progress-animal learned">${animal}</div>
                    `).join('')}
                </div>
                <button class="animal-next-btn">Завершить урок</button>
            </div>
        `;

        setTimeout(() => {
            content.querySelectorAll('.progress-animal').forEach((animal, index) => {
                setTimeout(() => {
                    animal.style.animation = 'animalLearned 0.5s ease-out';
                }, index * 200);
            });
        }, 500);

        const nextBtn = content.querySelector('.animal-next-btn');
        nextBtn.addEventListener('click', () => {
            this.completeLesson();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Озвучивание животных
    playAnimalSound(word, soundFile) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.7;
            speechSynthesis.speak(utterance);
        }
    }

    // Показ введения фрукта/овоща
    showFruitIntro(exercise, content) {
        content.innerHTML = `
            <div class="fruit-card fruit-intro-animation">
                <div class="question">${exercise.question}</div>
                <div class="fruit-emoji" data-word="${exercise.word}">${exercise.emoji}</div>
                <div class="fruit-word">${exercise.word}</div>
                <div class="fruit-pronunciation">${exercise.pronunciation}</div>
                <div class="fruit-translation">${exercise.translation}</div>
                <button class="fruit-sound-btn" title="Прослушать произношение">🔊</button>
                <button class="fruit-next-btn">Понятно! Далее</button>
            </div>
        `;

        // Звуковые эффекты
        const soundBtn = content.querySelector('.fruit-sound-btn');
        const emoji = content.querySelector('.fruit-emoji');
        const word = content.querySelector('.fruit-word');
        
        soundBtn.addEventListener('click', () => {
            this.playFruitSound(exercise.word, exercise.sound);
            emoji.style.animation = 'none';
            setTimeout(() => emoji.style.animation = 'fruitPulse 2s ease-in-out infinite', 10);
        });

        emoji.addEventListener('click', () => {
            this.playFruitSound(exercise.word, exercise.sound);
            emoji.style.animation = 'none';
            setTimeout(() => emoji.style.animation = 'fruitPulse 2s ease-in-out infinite', 10);
        });

        word.addEventListener('click', () => {
            this.playFruitSound(exercise.word, exercise.sound);
        });

        const nextBtn = content.querySelector('.fruit-next-btn');
        nextBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Показ викторины по фруктам
    showFruitQuiz(exercise, content) {
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="fruit-emoji quiz-emoji">${exercise.emoji}</div>
            <div class="options">
                ${exercise.options.map((option, index) => `
                    <button class="option" data-index="${index}">${option}</button>
                `).join('')}
            </div>
        `;

        content.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', () => {
                content.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                document.getElementById('check-btn').disabled = false;
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ сопоставления фруктов
    showFruitMatch(exercise, content) {
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="fruit-matching">
                ${exercise.pairs.map((pair, index) => `
                    <div class="match-pair" data-index="${index}">
                        <div class="match-fruit">${pair.emoji}</div>
                        <div class="match-word">${pair.word}</div>
                    </div>
                `).join('')}
            </div>
        `;

        // Автоматически считаем правильным
        setTimeout(() => {
            content.querySelectorAll('.match-pair').forEach(pair => {
                pair.classList.add('correct');
            });
            document.getElementById('check-btn').disabled = false;
            document.getElementById('check-btn').textContent = 'Продолжить';
        }, 2000);

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ завершения урока фруктов
    showFruitComplete(exercise, content) {
        const fruits = ['🍎', '🍌', '🍊', '🍐', '🍇', '🍓', '🍋', '🍒', '🍅', '🥕', '🥔', '🥒', '🧅', '🥬', '🌶️', '🥦'];
        
        content.innerHTML = `
            <div class="fruit-complete">
                <div class="fruit-complete-icon">🎉</div>
                <h2>${exercise.question}</h2>
                <p>${exercise.description}</p>
                <div class="fruit-progress-visual">
                    ${fruits.map(fruit => `
                        <div class="progress-fruit learned">${fruit}</div>
                    `).join('')}
                </div>
                <button class="fruit-next-btn">Завершить урок</button>
            </div>
        `;

        // Анимация появления фруктов
        const fruitEmojis = content.querySelectorAll('.progress-fruit');
        fruitEmojis.forEach((fruit, index) => {
            setTimeout(() => {
                fruit.style.animation = 'fruitLearned 0.5s ease-out';
            }, index * 100);
        });

        const nextBtn = content.querySelector('.fruit-next-btn');
        nextBtn.addEventListener('click', () => {
            this.completeLesson();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Воспроизведение звука фрукта/овоща
    playFruitSound(word, soundFile) {
        // Пока используем Speech Synthesis API как замену
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.7;
            utterance.pitch = 1.0;
            speechSynthesis.speak(utterance);
        }
        
        // В будущем здесь будет загрузка и воспроизведение аудио файла
        // const audio = new Audio(soundFile);
        // audio.play();
        
        if (this.tg && this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred('light');
        }
    }

    // Показ введения числа
    showNumberIntro(exercise, content) {
        content.innerHTML = `
            <div class="number-card number-intro-animation">
                <div class="question">${exercise.question}</div>
                <div class="number-emoji" data-word="${exercise.word}">${exercise.emoji}</div>
                <div class="number-value">${exercise.number}</div>
                <div class="number-word">${exercise.word}</div>
                <div class="number-pronunciation">${exercise.pronunciation}</div>
                <div class="number-translation">${exercise.translation}</div>
                <button class="number-sound-btn" title="Прослушать произношение">🔊</button>
                <button class="number-next-btn">Понятно! Далее</button>
            </div>
        `;

        // Звуковые эффекты
        const soundBtn = content.querySelector('.number-sound-btn');
        const emoji = content.querySelector('.number-emoji');
        const word = content.querySelector('.number-word');
        const numberValue = content.querySelector('.number-value');
        
        soundBtn.addEventListener('click', () => {
            this.playNumberSound(exercise.word, exercise.sound);
            emoji.style.animation = 'none';
            setTimeout(() => emoji.style.animation = 'numberPulse 2s ease-in-out infinite', 10);
        });

        emoji.addEventListener('click', () => {
            this.playNumberSound(exercise.word, exercise.sound);
            emoji.style.animation = 'none';
            setTimeout(() => emoji.style.animation = 'numberPulse 2s ease-in-out infinite', 10);
        });

        word.addEventListener('click', () => {
            this.playNumberSound(exercise.word, exercise.sound);
        });

        numberValue.addEventListener('click', () => {
            this.playNumberSound(exercise.word, exercise.sound);
        });

        const nextBtn = content.querySelector('.number-next-btn');
        nextBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Показ викторины по числам
    showNumberQuiz(exercise, content) {
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="number-display">
                <div class="number-emoji quiz-emoji">${exercise.emoji}</div>
                <div class="number-value-large">${exercise.number}</div>
            </div>
            <div class="options">
                ${exercise.options.map((option, index) => `
                    <button class="option" data-index="${index}">${option}</button>
                `).join('')}
            </div>
        `;

        content.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', () => {
                content.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                document.getElementById('check-btn').disabled = false;
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ сопоставления чисел
    showNumberMatch(exercise, content) {
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="number-matching">
                ${exercise.pairs.map((pair, index) => `
                    <div class="match-pair" data-index="${index}">
                        <div class="match-number">${pair.emoji}</div>
                        <div class="match-word">${pair.word}</div>
                    </div>
                `).join('')}
            </div>
        `;

        // Автоматически считаем правильным
        setTimeout(() => {
            content.querySelectorAll('.match-pair').forEach(pair => {
                pair.classList.add('correct');
            });
            document.getElementById('check-btn').disabled = false;
            document.getElementById('check-btn').textContent = 'Продолжить';
        }, 2000);

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ завершения урока чисел
    showNumberComplete(exercise, content) {
        const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        content.innerHTML = `
            <div class="number-complete">
                <div class="number-complete-icon">🎉</div>
                <h2>${exercise.question}</h2>
                <p>${exercise.description}</p>
                <div class="number-progress-visual">
                    ${numbers.map(number => `
                        <div class="progress-number learned">${number}</div>
                    `).join('')}
                </div>
                <button class="number-next-btn">Завершить урок</button>
            </div>
        `;

        // Анимация появления чисел
        const numberEmojis = content.querySelectorAll('.progress-number');
        numberEmojis.forEach((number, index) => {
            setTimeout(() => {
                number.style.animation = 'numberLearned 0.5s ease-out';
            }, index * 150);
        });

        const nextBtn = content.querySelector('.number-next-btn');
        nextBtn.addEventListener('click', () => {
            this.completeLesson();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Воспроизведение звука числа
    playNumberSound(word, soundFile) {
        // Пока используем Speech Synthesis API как замену
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.7;
            utterance.pitch = 1.0;
            speechSynthesis.speak(utterance);
        }
        
        // В будущем здесь будет загрузка и воспроизведение аудио файла
        // const audio = new Audio(soundFile);
        // audio.play();
        
        if (this.tg && this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred('light');
        }
    }

    // Показ введения приветствия
    showGreetingsIntro(exercise, content) {
        content.innerHTML = `
            <div class="greetings-card greetings-intro-animation">
                <div class="question">${exercise.question}</div>
                <div class="greetings-emoji" data-phrase="${exercise.phrase}">${exercise.emoji}</div>
                <div class="greetings-phrase">${exercise.phrase}</div>
                <div class="greetings-pronunciation">${exercise.pronunciation}</div>
                <div class="greetings-translation">${exercise.translation}</div>
                <div class="greetings-usage">${exercise.usage}</div>
                <button class="greetings-sound-btn" title="Прослушать произношение">🔊</button>
                <button class="greetings-next-btn">Понятно! Далее</button>
            </div>
        `;

        // Звуковые эффекты
        const soundBtn = content.querySelector('.greetings-sound-btn');
        const emoji = content.querySelector('.greetings-emoji');
        const phrase = content.querySelector('.greetings-phrase');
        
        soundBtn.addEventListener('click', () => {
            this.playGreetingsSound(exercise.phrase, exercise.sound);
            emoji.style.animation = 'none';
            setTimeout(() => emoji.style.animation = 'greetingsPulse 2s ease-in-out infinite', 10);
        });

        emoji.addEventListener('click', () => {
            this.playGreetingsSound(exercise.phrase, exercise.sound);
            emoji.style.animation = 'none';
            setTimeout(() => emoji.style.animation = 'greetingsPulse 2s ease-in-out infinite', 10);
        });

        phrase.addEventListener('click', () => {
            this.playGreetingsSound(exercise.phrase, exercise.sound);
        });

        const nextBtn = content.querySelector('.greetings-next-btn');
        nextBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
        
        // Автоматическое воспроизведение через полсекунды
        setTimeout(() => {
            this.playGreetingsSound(exercise.phrase, exercise.sound);
        }, 500);
    }

    // Показ викторины по приветствиям
    showGreetingsQuiz(exercise, content) {
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="greetings-display">
                <div class="greetings-phrase-large">${exercise.phrase}</div>
            </div>
            <div class="options">
                ${exercise.options.map((option, index) => `
                    <button class="option" data-index="${index}">${option}</button>
                `).join('')}
            </div>
        `;

        content.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', () => {
                content.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedAnswer = parseInt(option.dataset.index);
                document.getElementById('check-btn').disabled = false;
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ сопоставления приветствий
    showGreetingsMatch(exercise, content) {
        const shuffledPhrases = [...exercise.pairs].sort(() => Math.random() - 0.5);
        const shuffledTranslations = [...exercise.pairs].sort(() => Math.random() - 0.5);

        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="greetings-matching">
                <div class="match-column">
                    <h4>Фразы</h4>
                    ${shuffledPhrases.map((pair, index) => `
                        <div class="match-item phrase-item" data-phrase="${pair.phrase}">
                            ${pair.phrase}
                        </div>
                    `).join('')}
                </div>
                <div class="match-column">
                    <h4>Переводы</h4>
                    ${shuffledTranslations.map((pair, index) => `
                        <div class="match-item translation-item" data-translation="${pair.translation}">
                            ${pair.translation}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        let selectedPhrase = null;
        let selectedTranslation = null;
        this.selectedAnswer = [];

        content.querySelectorAll('.phrase-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.classList.contains('matched')) return;
                content.querySelectorAll('.phrase-item').forEach(p => p.classList.remove('selected'));
                item.classList.add('selected');
                selectedPhrase = item.dataset.phrase;
            });
        });

        content.querySelectorAll('.translation-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.classList.contains('matched')) return;
                content.querySelectorAll('.translation-item').forEach(t => t.classList.remove('selected'));
                item.classList.add('selected');
                selectedTranslation = item.dataset.translation;

                if (selectedPhrase && selectedTranslation) {
                    const pair = exercise.pairs.find(p => p.phrase === selectedPhrase && p.translation === selectedTranslation);
                    if (pair) {
                        const phraseElement = content.querySelector(`[data-phrase="${selectedPhrase}"]`);
                        const translationElement = content.querySelector(`[data-translation="${selectedTranslation}"]`);
                        
                        phraseElement.classList.add('matched');
                        translationElement.classList.add('matched');
                        
                        this.selectedAnswer.push({phrase: selectedPhrase, translation: selectedTranslation});
                        
                        selectedPhrase = null;
                        selectedTranslation = null;
                        content.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
                        
                        if (this.selectedAnswer.length === exercise.pairs.length) {
                            document.getElementById('check-btn').disabled = false;
                        }
                    }
                }
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ завершения урока приветствий
    showGreetingsComplete(exercise, content) {
        const greetings = ['👋', '🌅', '☀️', '🌆', '🤔', '😊', '❓', '🙋'];
        
        content.innerHTML = `
            <div class="greetings-complete">
                <div class="greetings-complete-icon">🎉</div>
                <h2>${exercise.question}</h2>
                <p>${exercise.description}</p>
                <div class="greetings-progress-visual">
                    ${greetings.map(greeting => `
                        <div class="progress-greeting learned">${greeting}</div>
                    `).join('')}
                </div>
                <button class="greetings-next-btn">Завершить урок</button>
            </div>
        `;

        // Анимация появления приветствий
        const greetingEmojis = content.querySelectorAll('.progress-greeting');
        greetingEmojis.forEach((greeting, index) => {
            setTimeout(() => {
                greeting.style.animation = 'greetingsLearned 0.5s ease-out';
            }, index * 150);
        });

        const nextBtn = content.querySelector('.greetings-next-btn');
        nextBtn.addEventListener('click', () => {
            this.completeLesson();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Воспроизведение звука приветствия
    playGreetingsSound(phrase, soundFile) {
        // Пока используем Speech Synthesis API как замену
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(phrase);
            utterance.lang = 'en-US';
            utterance.rate = 0.7;
            utterance.pitch = 1.0;
            speechSynthesis.speak(utterance);
        }
        
        // В будущем здесь будет загрузка и воспроизведение аудио файла
        // const audio = new Audio(soundFile);
        // audio.play();
        
        if (this.tg && this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred('light');
        }
    }

    // Показ введения члена семьи
    showFamilyIntro(exercise, content) {
        content.innerHTML = `
            <div class="family-card family-intro-animation">
                <div class="question">${exercise.question}</div>
                <div class="family-emoji" data-word="${exercise.word}">${exercise.emoji}</div>
                <div class="family-word">${exercise.word}</div>
                <div class="family-pronunciation">${exercise.pronunciation}</div>
                <div class="family-translation">${exercise.translation}</div>
                <div class="family-example">${exercise.example}</div>
                <button class="family-sound-btn" title="Прослушать произношение">🔊</button>
                <button class="family-next-btn">Понятно! Далее</button>
            </div>
        `;

        // Звуковые эффекты
        const soundBtn = content.querySelector('.family-sound-btn');
        const emoji = content.querySelector('.family-emoji');
        const word = content.querySelector('.family-word');
        
        soundBtn.addEventListener('click', () => {
            this.playFamilySound(exercise.word, exercise.sound);
            emoji.style.animation = 'none';
            setTimeout(() => emoji.style.animation = 'familyPulse 2s ease-in-out infinite', 10);
        });

        emoji.addEventListener('click', () => {
            this.playFamilySound(exercise.word, exercise.sound);
            emoji.style.animation = 'none';
            setTimeout(() => emoji.style.animation = 'familyPulse 2s ease-in-out infinite', 10);
        });

        word.addEventListener('click', () => {
            this.playFamilySound(exercise.word, exercise.sound);
        });

        const nextBtn = content.querySelector('.family-next-btn');
        nextBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
        
        // Автоматическое воспроизведение через полсекунды
        setTimeout(() => {
            this.playFamilySound(exercise.word, exercise.sound);
        }, 500);
    }

    // Показ викторины по семье
    showFamilyQuiz(exercise, content) {
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="family-display">
                <div class="family-word-large">${exercise.word}</div>
            </div>
            <div class="options">
                ${exercise.options.map((option, index) => `
                    <button class="option" data-index="${index}">${option}</button>
                `).join('')}
            </div>
        `;

        content.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', () => {
                content.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedAnswer = parseInt(option.dataset.index);
                document.getElementById('check-btn').disabled = false;
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ сопоставления семьи
    showFamilyMatch(exercise, content) {
        const shuffledWords = [...exercise.pairs].sort(() => Math.random() - 0.5);
        const shuffledTranslations = [...exercise.pairs].sort(() => Math.random() - 0.5);

        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="family-matching">
                <div class="match-column">
                    <h4>Английский</h4>
                    ${shuffledWords.map((pair, index) => `
                        <div class="match-item word-item" data-word="${pair.word}">
                            ${pair.word}
                        </div>
                    `).join('')}
                </div>
                <div class="match-column">
                    <h4>Русский</h4>
                    ${shuffledTranslations.map((pair, index) => `
                        <div class="match-item translation-item" data-translation="${pair.translation}">
                            ${pair.translation}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        let selectedWord = null;
        let selectedTranslation = null;
        this.selectedAnswer = [];

        content.querySelectorAll('.word-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.classList.contains('matched')) return;
                content.querySelectorAll('.word-item').forEach(w => w.classList.remove('selected'));
                item.classList.add('selected');
                selectedWord = item.dataset.word;
            });
        });

        content.querySelectorAll('.translation-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.classList.contains('matched')) return;
                content.querySelectorAll('.translation-item').forEach(t => t.classList.remove('selected'));
                item.classList.add('selected');
                selectedTranslation = item.dataset.translation;

                if (selectedWord && selectedTranslation) {
                    const pair = exercise.pairs.find(p => p.word === selectedWord && p.translation === selectedTranslation);
                    if (pair) {
                        const wordElement = content.querySelector(`[data-word="${selectedWord}"]`);
                        const translationElement = content.querySelector(`[data-translation="${selectedTranslation}"]`);
                        
                        wordElement.classList.add('matched');
                        translationElement.classList.add('matched');
                        
                        this.selectedAnswer.push({word: selectedWord, translation: selectedTranslation});
                        
                        selectedWord = null;
                        selectedTranslation = null;
                        content.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
                        
                        if (this.selectedAnswer.length === exercise.pairs.length) {
                            document.getElementById('check-btn').disabled = false;
                        }
                    }
                }
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ завершения урока семьи
    showFamilyComplete(exercise, content) {
        const family = ['👩', '👨', '👧', '👦', '👵', '👴', '👶', '👨‍👩‍👧‍👦'];
        
        content.innerHTML = `
            <div class="family-complete">
                <div class="family-complete-icon">🎉</div>
                <h2>${exercise.question}</h2>
                <p>${exercise.description}</p>
                <div class="family-progress-visual">
                    ${family.map(member => `
                        <div class="progress-family learned">${member}</div>
                    `).join('')}
                </div>
                <button class="family-next-btn">Завершить урок</button>
            </div>
        `;

        // Анимация появления членов семьи
        const familyEmojis = content.querySelectorAll('.progress-family');
        familyEmojis.forEach((member, index) => {
            setTimeout(() => {
                member.style.animation = 'familyLearned 0.5s ease-out';
            }, index * 150);
        });

        const nextBtn = content.querySelector('.family-next-btn');
        nextBtn.addEventListener('click', () => {
            this.completeLesson();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Воспроизведение звука члена семьи
    playFamilySound(word, soundFile) {
        // Пока используем Speech Synthesis API как замену
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.7;
            utterance.pitch = 1.0;
            speechSynthesis.speak(utterance);
        }
        
        // В будущем здесь будет загрузка и воспроизведение аудио файла
        // const audio = new Audio(soundFile);
        // audio.play();
        
        if (this.tg && this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred('light');
        }
    }

    // Показ введения цвета
    showColorsIntro(exercise, content) {
        content.innerHTML = `
            <div class="colors-card colors-intro-animation">
                <div class="question">${exercise.question}</div>
                <div class="colors-emoji" data-word="${exercise.word}">${exercise.emoji}</div>
                <div class="colors-word">${exercise.word}</div>
                <div class="colors-pronunciation">${exercise.pronunciation}</div>
                <div class="colors-translation">${exercise.translation}</div>
                <div class="colors-example">${exercise.example}</div>
                <button class="colors-sound-btn" title="Прослушать произношение">🔊</button>
                <button class="colors-next-btn">Понятно! Далее</button>
            </div>
        `;

        // Звуковые эффекты
        const soundBtn = content.querySelector('.colors-sound-btn');
        const emoji = content.querySelector('.colors-emoji');
        const word = content.querySelector('.colors-word');
        
        soundBtn.addEventListener('click', () => {
            this.playColorsSound(exercise.word, exercise.sound);
            emoji.style.animation = 'none';
            setTimeout(() => emoji.style.animation = 'colorsPulse 2s ease-in-out infinite', 10);
        });

        emoji.addEventListener('click', () => {
            this.playColorsSound(exercise.word, exercise.sound);
            emoji.style.animation = 'none';
            setTimeout(() => emoji.style.animation = 'colorsPulse 2s ease-in-out infinite', 10);
        });

        word.addEventListener('click', () => {
            this.playColorsSound(exercise.word, exercise.sound);
        });

        const nextBtn = content.querySelector('.colors-next-btn');
        nextBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
        
        // Автоматическое воспроизведение через полсекунды
        setTimeout(() => {
            this.playColorsSound(exercise.word, exercise.sound);
        }, 500);
    }

    // Показ викторины по цветам
    showColorsQuiz(exercise, content) {
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="colors-display">
                <div class="colors-word-large">${exercise.word}</div>
            </div>
            <div class="options">
                ${exercise.options.map((option, index) => `
                    <button class="option" data-index="${index}">${option}</button>
                `).join('')}
            </div>
        `;

        content.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', () => {
                content.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedAnswer = parseInt(option.dataset.index);
                document.getElementById('check-btn').disabled = false;
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ сопоставления цветов
    showColorsMatch(exercise, content) {
        const shuffledWords = [...exercise.pairs].sort(() => Math.random() - 0.5);
        const shuffledTranslations = [...exercise.pairs].sort(() => Math.random() - 0.5);

        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="colors-matching">
                <div class="match-column">
                    <h4>Английский</h4>
                    ${shuffledWords.map((pair, index) => `
                        <div class="match-item word-item" data-word="${pair.word}">
                            ${pair.word}
                        </div>
                    `).join('')}
                </div>
                <div class="match-column">
                    <h4>Русский</h4>
                    ${shuffledTranslations.map((pair, index) => `
                        <div class="match-item translation-item" data-translation="${pair.translation}">
                            ${pair.translation}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        let selectedWord = null;
        let selectedTranslation = null;
        this.selectedAnswer = [];

        content.querySelectorAll('.word-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.classList.contains('matched')) return;
                content.querySelectorAll('.word-item').forEach(w => w.classList.remove('selected'));
                item.classList.add('selected');
                selectedWord = item.dataset.word;
            });
        });

        content.querySelectorAll('.translation-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.classList.contains('matched')) return;
                content.querySelectorAll('.translation-item').forEach(t => t.classList.remove('selected'));
                item.classList.add('selected');
                selectedTranslation = item.dataset.translation;

                if (selectedWord && selectedTranslation) {
                    const pair = exercise.pairs.find(p => p.word === selectedWord && p.translation === selectedTranslation);
                    if (pair) {
                        const wordElement = content.querySelector(`[data-word="${selectedWord}"]`);
                        const translationElement = content.querySelector(`[data-translation="${selectedTranslation}"]`);
                        
                        wordElement.classList.add('matched');
                        translationElement.classList.add('matched');
                        
                        this.selectedAnswer.push({word: selectedWord, translation: selectedTranslation});
                        
                        selectedWord = null;
                        selectedTranslation = null;
                        content.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
                        
                        if (this.selectedAnswer.length === exercise.pairs.length) {
                            document.getElementById('check-btn').disabled = false;
                        }
                    }
                }
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ завершения урока цветов
    showColorsComplete(exercise, content) {
        const colors = ['🔴', '🔵', '🟢', '🟡', '🟠', '🟣', '⚫', '⚪', '🩷'];
        
        content.innerHTML = `
            <div class="colors-complete">
                <div class="colors-complete-icon">🎉</div>
                <h2>${exercise.question}</h2>
                <p>${exercise.description}</p>
                <div class="colors-progress-visual">
                    ${colors.map(color => `
                        <div class="progress-color learned">${color}</div>
                    `).join('')}
                </div>
                <button class="colors-next-btn">Завершить урок</button>
            </div>
        `;

        // Анимация появления цветов
        const colorEmojis = content.querySelectorAll('.progress-color');
        colorEmojis.forEach((color, index) => {
            setTimeout(() => {
                color.style.animation = 'colorsLearned 0.5s ease-out';
            }, index * 150);
        });

        const nextBtn = content.querySelector('.colors-next-btn');
        nextBtn.addEventListener('click', () => {
            this.completeLesson();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Воспроизведение звука цвета
    playColorsSound(word, soundFile) {
        // Пока используем Speech Synthesis API как замену
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.7;
            utterance.pitch = 1.0;
            speechSynthesis.speak(utterance);
        }
        
        // В будущем здесь будет загрузка и воспроизведение аудио файла
        // const audio = new Audio(soundFile);
        // audio.play();
        
        if (this.tg && this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred('light');
        }
    }

    // Показ введения части тела
    showBodyIntro(exercise, content) {
        content.innerHTML = `
            <div class="body-card body-intro-animation">
                <div class="question">${exercise.question}</div>
                <div class="body-emoji">${exercise.emoji}</div>
                <div class="body-word" data-word="${exercise.word}">${exercise.word}</div>
                <div class="body-pronunciation">${exercise.pronunciation}</div>
                <div class="body-translation">${exercise.translation}</div>
                <div class="body-example">${exercise.example}</div>
                <button class="body-sound-btn" title="Прослушать произношение">🔊</button>
                <button class="body-next-btn">Понятно! Далее</button>
            </div>
        `;

        // Звуковые эффекты
        const soundBtn = content.querySelector('.body-sound-btn');
        const emoji = content.querySelector('.body-emoji');
        const word = content.querySelector('.body-word');
        
        soundBtn.addEventListener('click', () => {
            this.playBodySound(exercise.word, exercise.sound);
            emoji.style.animation = 'none';
            setTimeout(() => emoji.style.animation = 'bodyPulse 2s ease-in-out infinite', 10);
        });

        emoji.addEventListener('click', () => {
            this.playBodySound(exercise.word, exercise.sound);
            emoji.style.animation = 'none';
            setTimeout(() => emoji.style.animation = 'bodyPulse 2s ease-in-out infinite', 10);
        });

        word.addEventListener('click', () => {
            this.playBodySound(exercise.word, exercise.sound);
        });

        const nextBtn = content.querySelector('.body-next-btn');
        nextBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
        
        // Автоматическое воспроизведение через полсекунды
        setTimeout(() => {
            this.playBodySound(exercise.word, exercise.sound);
        }, 500);
    }

    // Показ викторины по частям тела
    showBodyQuiz(exercise, content) {
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="body-display">
                <div class="body-word-large">${exercise.word}</div>
            </div>
            <div class="options">
                ${exercise.options.map((option, index) => `
                    <button class="option" data-index="${index}">${option}</button>
                `).join('')}
            </div>
        `;

        content.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', () => {
                content.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedAnswer = parseInt(option.dataset.index);
                document.getElementById('check-btn').disabled = false;
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ сопоставления частей тела
    showBodyMatch(exercise, content) {
        const shuffledWords = [...exercise.pairs].sort(() => Math.random() - 0.5);
        const shuffledTranslations = [...exercise.pairs].sort(() => Math.random() - 0.5);

        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="body-matching">
                <div class="match-column">
                    <h4>Английский</h4>
                    ${shuffledWords.map((pair, index) => `
                        <div class="match-item word-item" data-word="${pair.word}">
                            ${pair.word}
                        </div>
                    `).join('')}
                </div>
                <div class="match-column">
                    <h4>Русский</h4>
                    ${shuffledTranslations.map((pair, index) => `
                        <div class="match-item translation-item" data-translation="${pair.translation}">
                            ${pair.translation}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        let selectedWord = null;
        let selectedTranslation = null;
        this.selectedAnswer = [];

        content.querySelectorAll('.word-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.classList.contains('matched')) return;
                content.querySelectorAll('.word-item').forEach(w => w.classList.remove('selected'));
                item.classList.add('selected');
                selectedWord = item.dataset.word;
            });
        });

        content.querySelectorAll('.translation-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.classList.contains('matched')) return;
                content.querySelectorAll('.translation-item').forEach(t => t.classList.remove('selected'));
                item.classList.add('selected');
                selectedTranslation = item.dataset.translation;

                if (selectedWord && selectedTranslation) {
                    const pair = exercise.pairs.find(p => p.word === selectedWord && p.translation === selectedTranslation);
                    if (pair) {
                        const wordElement = content.querySelector(`[data-word="${selectedWord}"]`);
                        const translationElement = content.querySelector(`[data-translation="${selectedTranslation}"]`);
                        
                        wordElement.classList.add('matched');
                        translationElement.classList.add('matched');
                        
                        this.selectedAnswer.push({word: selectedWord, translation: selectedTranslation});
                        
                        selectedWord = null;
                        selectedTranslation = null;
                        content.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
                        
                        if (this.selectedAnswer.length === exercise.pairs.length) {
                            document.getElementById('check-btn').disabled = false;
                        }
                    }
                }
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ завершения урока частей тела
    showBodyComplete(exercise, content) {
        const bodyParts = ['👤', '👀', '👃', '👄', '👐', '🦵', '🦶', '👂', '💇'];
        
        content.innerHTML = `
            <div class="body-complete">
                <div class="body-complete-icon">🎉</div>
                <h2>${exercise.question}</h2>
                <p>${exercise.description}</p>
                <div class="body-progress-visual">
                    ${bodyParts.map(bodyPart => `
                        <div class="progress-body learned">${bodyPart}</div>
                    `).join('')}
                </div>
                <button class="body-next-btn">Завершить урок</button>
            </div>
        `;

        // Анимация появления частей тела
        const bodyEmojis = content.querySelectorAll('.progress-body');
        bodyEmojis.forEach((bodyPart, index) => {
            setTimeout(() => {
                bodyPart.style.animation = 'bodyLearned 0.5s ease-out';
            }, index * 150);
        });

        const nextBtn = content.querySelector('.body-next-btn');
        nextBtn.addEventListener('click', () => {
            this.completeLesson();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Воспроизведение звука части тела
    playBodySound(word, soundFile) {
        // Пока используем Speech Synthesis API как замену
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.7;
            utterance.pitch = 1.0;
            speechSynthesis.speak(utterance);
        }
        
        // В будущем здесь будет загрузка и воспроизведение аудио файла
        // const audio = new Audio(soundFile);
        // audio.play();
        
        if (this.tg && this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred('light');
        }
    }

    // Показ начала финального теста
    showTestStart(exercise, content) {
        content.innerHTML = `
            <div class="test-start-card">
                <div class="test-icon">🎯</div>
                <h2>${exercise.question}</h2>
                <p>${exercise.description}</p>
                <button class="test-start-btn">Начать тест</button>
            </div>
        `;

        const startBtn = content.querySelector('.test-start-btn');
        startBtn.addEventListener('click', () => {
            this.startFinalTest();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Запуск финального теста
    startFinalTest() {
        // Собираем все quiz упражнения из начального уровня
        const allQuizExercises = [];
        
        // Проходим по всем урокам начального уровня (кроме финального теста)
        if (this.levels && this.levels.beginner && this.levels.beginner.lessons) {
            this.levels.beginner.lessons.forEach(lesson => {
                if (lesson.type !== 'final-test') {
                    lesson.exercises.forEach(exercise => {
                        if (exercise.type.includes('-quiz')) {
                            allQuizExercises.push({
                                ...exercise,
                                topic: lesson.title
                            });
                        }
                    });
                }
            });
        }

        if (allQuizExercises.length === 0) {
            alert('Не найдено quiz упражнений для теста!');
            return;
        }

        // Перемешиваем и берем 20 вопросов (или меньше, если недостаточно)
        const shuffled = allQuizExercises.sort(() => Math.random() - 0.5);
        this.testQuestions = shuffled.slice(0, Math.min(20, allQuizExercises.length));
        
        console.log('🧪 Тест инициализирован:', this.testQuestions.length, 'вопросов');
        
        // Инициализируем состояние теста
        this.currentTestQuestion = 0;
        this.testScore = 0;
        this.testStartTime = Date.now();
        
        // Показываем первый вопрос
        this.showTestQuestion();
    }

    // Показ вопроса теста
    showTestQuestion() {
        console.log(`📝 Показываем вопрос ${this.currentTestQuestion + 1} из ${this.testQuestions.length}`);
        
        if (this.currentTestQuestion >= this.testQuestions.length) {
            console.log('✅ Тест завершен, показываем результаты');
            this.showTestComplete();
            return;
        }

        const question = this.testQuestions[this.currentTestQuestion];
        const content = document.getElementById('exercise-content');
        
        content.innerHTML = `
            <div class="test-progress-section">
                <div class="test-progress-info">
                    <span class="test-current-question">Вопрос ${this.currentTestQuestion + 1} из ${this.testQuestions.length}</span>
                    <span class="test-score">Правильно: ${this.testScore}</span>
                </div>
                <div class="test-progress-bar">
                    <div class="test-progress-fill" style="width: ${((this.currentTestQuestion + 1) / this.testQuestions.length) * 100}%"></div>
                </div>
            </div>
            
            <div class="test-question-card">
                <div class="test-question-number">Вопрос ${this.currentTestQuestion + 1}</div>
                <div class="test-question">${question.question}</div>
                ${(question.emoji || question.animal) ? `<div class="test-emoji-display">${question.emoji || question.animal}</div>` : ''}
                ${question.word ? `<div class="test-word-display">${question.word}</div>` : ''}
                <div class="test-options">
                    ${question.options.map((option, index) => `
                        <button class="test-option" data-index="${index}">${option}</button>
                    `).join('')}
                </div>
                ${question.topic ? `<div class="test-topic">Тема: ${question.topic}</div>` : ''}
            </div>
        `;

        // Привязываем события к опциям
        content.querySelectorAll('.test-option').forEach(option => {
            option.addEventListener('click', () => {
                content.querySelectorAll('.test-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedTestAnswer = parseInt(option.dataset.index);
                const checkBtn = document.getElementById('check-btn');
                if (checkBtn) {
                    checkBtn.disabled = false;
                }
            });
        });

        const checkBtn = document.getElementById('check-btn');
        checkBtn.style.display = 'block';
        checkBtn.disabled = true;
        checkBtn.textContent = 'Ответить';
        checkBtn.onclick = () => this.checkTestAnswer();
        
        // Обновляем прогресс упражнения
        const progressFill = document.getElementById('exercise-progress-fill');
        const exerciseCount = document.getElementById('exercise-count');
        
        const progress = ((this.currentTestQuestion + 1) / this.testQuestions.length) * 100;
        progressFill.style.width = `${progress}%`;
        exerciseCount.textContent = `${this.currentTestQuestion + 1}/${this.testQuestions.length}`;
    }

    // Проверка ответа в тесте
    checkTestAnswer() {
        const question = this.testQuestions[this.currentTestQuestion];
        const content = document.getElementById('exercise-content');
        const isCorrect = this.selectedTestAnswer === question.correct;

        // Показываем правильный/неправильный ответ
        content.querySelectorAll('.test-option').forEach((option, index) => {
            if (index === question.correct) {
                option.classList.add('correct');
            } else if (option.classList.contains('selected') && !isCorrect) {
                option.classList.add('incorrect');
            }
        });

        if (isCorrect) {
            this.testScore++;
            this.triggerHaptic('success');
        } else {
            this.triggerHaptic('error');
        }

        // Показываем объяснение если есть
        if (question.explanation) {
            setTimeout(() => {
                const explanation = document.createElement('div');
                explanation.className = 'test-explanation';
                explanation.style.cssText = `
                    background: #f8f9fa;
                    border-left: 4px solid var(--primary-color);
                    padding: 1rem;
                    margin-top: 1rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                `;
                explanation.innerHTML = `💡 ${question.explanation}`;
                content.appendChild(explanation);
            }, 500);
        }

        // Обновляем счет
        const scoreElement = content.querySelector('.test-score');
        if (scoreElement) {
            scoreElement.textContent = `Правильно: ${this.testScore}`;
        }

        const checkBtn = document.getElementById('check-btn');
        checkBtn.textContent = 'Продолжить';
        checkBtn.onclick = () => this.nextTestQuestion();
    }

    // Следующий вопрос теста
    nextTestQuestion() {
        console.log(`➡️ Переход к следующему вопросу: ${this.currentTestQuestion + 1} -> ${this.currentTestQuestion + 2}`);
        console.log(`🔍 Всего вопросов: ${this.testQuestions.length}`);
        
        this.currentTestQuestion++;
        
        if (this.currentTestQuestion < this.testQuestions.length) {
            console.log(`📄 Показываем вопрос ${this.currentTestQuestion + 1}`);
            this.showTestQuestion();
        } else {
            console.log(`🏁 Достигнут конец теста, показываем результаты`);
            this.showTestComplete();
        }
    }

    // Показ результатов теста
    showTestComplete() {
        const testTime = Math.floor((Date.now() - this.testStartTime) / 1000);
        const minutes = Math.floor(testTime / 60);
        const seconds = testTime % 60;
        const percentage = Math.round((this.testScore / this.testQuestions.length) * 100);
        
        let grade = '';
        let gradeColor = '';
        if (percentage >= 90) {
            grade = 'Отлично!';
            gradeColor = '#27AE60';
        } else if (percentage >= 70) {
            grade = 'Хорошо!';
            gradeColor = '#F39C12';
        } else if (percentage >= 50) {
            grade = 'Удовлетворительно';
            gradeColor = '#E67E22';
        } else {
            grade = 'Попробуйте ещё раз';
            gradeColor = '#E74C3C';
        }

        const content = document.getElementById('exercise-content');
        content.innerHTML = `
            <div class="test-complete-card">
                <div class="test-complete-icon">🏆</div>
                <h2>Тест завершён!</h2>
                <div class="test-results-grid">
                    <div class="test-result-item">
                        <div class="test-result-value">${this.testScore}/${this.testQuestions.length}</div>
                        <div class="test-result-label">Правильно</div>
                    </div>
                    <div class="test-result-item">
                        <div class="test-result-value">${percentage}%</div>
                        <div class="test-result-label">Результат</div>
                    </div>
                    <div class="test-result-item">
                        <div class="test-result-value" style="color: ${gradeColor}">${grade}</div>
                        <div class="test-result-label">Оценка</div>
                    </div>
                    <div class="test-result-item">
                        <div class="test-result-value">${minutes}:${seconds.toString().padStart(2, '0')}</div>
                        <div class="test-result-label">Время</div>
                    </div>
                </div>
                <button class="test-complete-btn">Завершить</button>
            </div>
        `;

        const completeBtn = content.querySelector('.test-complete-btn');
        completeBtn.addEventListener('click', () => {
            // Помечаем тест как пройденный
            if (!this.userProgress[this.currentLevel]) {
                this.userProgress[this.currentLevel] = {};
            }
            this.userProgress[this.currentLevel][this.currentLesson.id] = true;
            
            // Добавляем бонусный опыт за тест
            const bonusXP = this.testScore * 15; // 15 XP за правильный ответ
            this.userProgress.totalXP = (this.userProgress.totalXP || 0) + bonusXP;
            
            this.saveProgress();
            this.showLessonsScreen();
            this.updateProgress();
        });

        const checkBtn = document.getElementById('check-btn');
        if (checkBtn) {
            checkBtn.style.display = 'none';
        }
    }

    // Методы для упражнений среднего уровня

    // Показ введения в грамматику
    showGrammarIntro(exercise, content) {
        content.innerHTML = `
            <div class="grammar-intro-card">
                <div class="question">${exercise.question}</div>
                <div class="grammar-title">${exercise.title}</div>
                <div class="grammar-explanation">${exercise.explanation}</div>
                <div class="grammar-rule">
                    <strong>Правило:</strong><br>
                    ${exercise.rule.replace(/\n/g, '<br>')}
                </div>
                <div class="grammar-examples">
                    <strong>Примеры:</strong>
                    ${exercise.examples.map(ex => `
                        <div class="example-pair">
                            <div class="english">${ex.english}</div>
                            <div class="russian">${ex.russian}</div>
                        </div>
                    `).join('')}
                </div>
                <button class="grammar-next-btn">Понятно! Далее</button>
            </div>
        `;

        const nextBtn = content.querySelector('.grammar-next-btn');
        nextBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Показ практики грамматики
    showGrammarPractice(exercise, content) {
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="grammar-sentence">"${exercise.sentence}"</div>
            <div class="options">
                ${exercise.options.map((option, index) => `
                    <button class="option" data-index="${index}">${option}</button>
                `).join('')}
            </div>
        `;

        content.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', () => {
                content.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                document.getElementById('check-btn').disabled = false;
            });
        });

        document.getElementById('check-btn').style.display = 'block';
    }

    // Показ завершения грамматики
    showGrammarComplete(exercise, content) {
        content.innerHTML = `
            <div class="complete-card grammar-complete-animation">
                <div class="achievement-icon">🎯</div>
                <div class="question">${exercise.question}</div>
                <div class="achievement-text">${exercise.achievement}</div>
                <div class="description">${exercise.description}</div>
                <button class="complete-next-btn">Продолжить</button>
            </div>
        `;

        const nextBtn = content.querySelector('.complete-next-btn');
        nextBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Показ введения в словарь
    showVocabularyIntro(exercise, content) {
        content.innerHTML = `
            <div class="vocabulary-intro-card">
                <div class="question">${exercise.question}</div>
                <div class="vocabulary-title">${exercise.title}</div>
                <div class="vocabulary-words">
                    ${exercise.words.map(word => `
                        <div class="word-card" data-word="${word.word}">
                            <div class="word-emoji">${word.emoji}</div>
                            <div class="word-english">${word.word}</div>
                            <div class="word-pronunciation">${word.pronunciation}</div>
                            <div class="word-translation">${word.translation}</div>
                            <button class="word-sound-btn" title="Прослушать произношение">🔊</button>
                        </div>
                    `).join('')}
                </div>
                <button class="vocabulary-next-btn">Понятно! Далее</button>
            </div>
        `;

        // Добавляем звуковые эффекты
        content.querySelectorAll('.word-sound-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wordCard = e.target.closest('.word-card');
                const word = wordCard.dataset.word;
                this.playWordSound(word);
                
                // Анимация
                wordCard.style.animation = 'none';
                setTimeout(() => wordCard.style.animation = 'wordPulse 1s ease-in-out', 10);
            });
        });

        const nextBtn = content.querySelector('.vocabulary-next-btn');
        nextBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Показ сопоставления словаря
    showVocabularyMatch(exercise, content) {
        const shuffledPairs = [...exercise.pairs].sort(() => Math.random() - 0.5);
        
        content.innerHTML = `
            <div class="question">${exercise.question}</div>
            <div class="vocabulary-match-container">
                <div class="match-column english-column">
                    ${shuffledPairs.map(pair => `
                        <div class="match-item english-item" data-id="${pair.english}">
                            ${pair.emoji} ${pair.english}
                        </div>
                    `).join('')}
                </div>
                <div class="match-column russian-column">
                    ${shuffledPairs.sort(() => Math.random() - 0.5).map(pair => `
                        <div class="match-item russian-item" data-id="${pair.english}">
                            ${pair.russian}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        let selectedEnglish = null;
        let matches = 0;
        const totalMatches = exercise.pairs.length;

        content.querySelectorAll('.english-item').forEach(item => {
            item.addEventListener('click', () => {
                content.querySelectorAll('.english-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                selectedEnglish = item.dataset.id;
            });
        });

        content.querySelectorAll('.russian-item').forEach(item => {
            item.addEventListener('click', () => {
                if (selectedEnglish && selectedEnglish === item.dataset.id) {
                    item.classList.add('matched');
                    content.querySelector(`[data-id="${selectedEnglish}"].english-item`).classList.add('matched');
                    matches++;
                    selectedEnglish = null;
                    
                    if (matches === totalMatches) {
                        setTimeout(() => {
                            this.nextExercise();
                        }, 1000);
                    }
                } else if (selectedEnglish) {
                    item.classList.add('wrong');
                    setTimeout(() => item.classList.remove('wrong'), 500);
                }
            });
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Показ завершения словаря
    showVocabularyComplete(exercise, content) {
        content.innerHTML = `
            <div class="complete-card vocabulary-complete-animation">
                <div class="achievement-icon">📚</div>
                <div class="question">${exercise.question}</div>
                <div class="achievement-text">${exercise.achievement}</div>
                <div class="description">${exercise.description}</div>
                <button class="complete-next-btn">Продолжить</button>
            </div>
        `;

        const nextBtn = content.querySelector('.complete-next-btn');
        nextBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Показ повторения тем
    showTestReview(exercise, content) {
        content.innerHTML = `
            <div class="test-review-card">
                <div class="question">${exercise.question}</div>
                <div class="review-title">${exercise.title}</div>
                <div class="topics-grid">
                    ${exercise.topics.map(topic => `
                        <div class="topic-card">
                            <div class="topic-icon">${topic.icon}</div>
                            <div class="topic-title">${topic.title}</div>
                            <div class="topic-description">${topic.description}</div>
                        </div>
                    `).join('')}
                </div>
                <button class="review-next-btn">Готов к тесту!</button>
            </div>
        `;

        const nextBtn = content.querySelector('.review-next-btn');
        nextBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Показ финального теста
    showFinalTest(exercise, content) {
        content.innerHTML = `
            <div class="final-test-card">
                <div class="question">${exercise.question}</div>
                <div class="test-description">${exercise.description}</div>
                <div class="achievement-icon">🏆</div>
                <div class="achievement-text">${exercise.achievement}</div>
                <button class="final-test-btn">Завершить уровень</button>
            </div>
        `;

        const testBtn = content.querySelector('.final-test-btn');
        testBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        document.getElementById('check-btn').style.display = 'none';
    }

    // Проигрывание звука слова
    playWordSound(word) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;
            speechSynthesis.speak(utterance);
        }
    }

    // Методы для продвинутого уровня
    showAdvancedGrammarIntro(exercise, content) {
        content.innerHTML = `
            <div class="advanced-intro">
                <div class="intro-header">
                    <div class="intro-icon">📚</div>
                    <h2>${exercise.title}</h2>
                </div>
                
                <div class="grammar-content">
                    <div class="explanation-section">
                        <h3>Объяснение</h3>
                        <p>${exercise.explanation}</p>
                    </div>
                    
                    <div class="rule-section">
                        <h3>Правило</h3>
                        <div class="rule-box">
                            ${exercise.rule.split('\\n').map(rule => `<div class="rule-line">${rule}</div>`).join('')}
                        </div>
                    </div>
                    
                    <div class="examples-section">
                        <h3>Примеры</h3>
                        <div class="examples-grid">
                            ${exercise.examples.map(example => `
                                <div class="example-card">
                                    <div class="example-type">${example.type}</div>
                                    <div class="example-english">${example.english}</div>
                                    <div class="example-russian">${example.russian}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="intro-actions">
                    <button id="continue-btn" class="btn btn-primary">Продолжить</button>
                </div>
            </div>
        `;

        // Добавляем обработчик для кнопки продолжить
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.nextExercise();
            });
        }

        document.getElementById('check-btn').style.display = 'none';
    }

    showAdvancedPractice(exercise, content) {
        content.innerHTML = `
            <div class="advanced-practice">
                <div class="question-section">
                    <h3>${exercise.question}</h3>
                    <div class="sentence-practice">
                        <p class="practice-sentence">${exercise.sentence}</p>
                    </div>
                </div>
                
                <div class="options-grid">
                    ${exercise.options.map((option, index) => `
                        <div class="option advanced-option" data-option="${index}">
                            ${option}
                        </div>
                    `).join('')}
                </div>
                
                <div class="explanation-box" id="explanation-box" style="display: none;">
                    <div class="explanation-icon">💡</div>
                    <p>${exercise.explanation}</p>
                </div>
                
                <div class="exercise-actions">
                    <button id="check-btn" class="btn btn-primary">Проверить</button>
                </div>
            </div>
        `;

        // Добавляем обработчики для вариантов ответа
        const options = content.querySelectorAll('.advanced-option');
        options.forEach((option, index) => {
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedOption = index;
            });
        });
    }

    showAdvancedVocabularyIntro(exercise, content) {
        content.innerHTML = `
            <div class="advanced-vocabulary">
                <div class="vocab-header">
                    <div class="vocab-icon">📖</div>
                    <h2>${exercise.title}</h2>
                </div>
                
                <div class="words-grid">
                    ${exercise.words.map(wordObj => `
                        <div class="word-card advanced-word">
                            <div class="word-emoji">${wordObj.emoji}</div>
                            <div class="word-main">
                                <div class="word-english">${wordObj.word}</div>
                                <div class="word-pronunciation">${wordObj.pronunciation}</div>
                                <div class="word-translation">${wordObj.translation}</div>
                            </div>
                            <div class="word-context">"${wordObj.context}"</div>
                            <button class="sound-btn" data-word="${wordObj.word}">🔊</button>
                        </div>
                    `).join('')}
                </div>
                
                <div class="vocab-actions">
                    <button id="continue-btn" class="btn btn-primary">Продолжить</button>
                </div>
            </div>
        `;

        // Добавляем звуковые эффекты
        content.querySelectorAll('.sound-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const word = btn.dataset.word;
                this.playWordSound(word);
            });
        });

        // Добавляем обработчик для кнопки продолжить
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.nextExercise();
            });
        }

        document.getElementById('check-btn').style.display = 'none';
    }

    showAdvancedContextMatch(exercise, content) {
        content.innerHTML = `
            <div class="advanced-context-match">
                <div class="match-header">
                    <h3>${exercise.question}</h3>
                </div>
                
                <div class="context-pairs">
                    ${exercise.pairs.map((pair, index) => `
                        <div class="context-pair" data-index="${index}">
                            <div class="phrase-side">
                                <div class="context-emoji">${pair.emoji}</div>
                                <div class="context-phrase">${pair.phrase}</div>
                            </div>
                            <div class="arrow">→</div>
                            <div class="situation-side">
                                <div class="context-situation">${pair.situation}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="match-actions">
                    <button id="continue-btn" class="btn btn-primary">Продолжить</button>
                </div>
            </div>
        `;

        // Добавляем обработчик для кнопки продолжить
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.nextExercise();
            });
        }

        document.getElementById('check-btn').style.display = 'none';
    }

    showAdvancedComplete(exercise, content) {
        content.innerHTML = `
            <div class="advanced-complete">
                <div class="complete-icon">🎉</div>
                <h2>${exercise.question}</h2>
                <p class="complete-description">${exercise.description}</p>
                
                <div class="achievement-badge">
                    <div class="achievement-icon">${exercise.achievement}</div>
                </div>
                
                <div class="complete-actions">
                    <button id="continue-btn" class="btn btn-primary">Продолжить</button>
                </div>
            </div>
        `;

        // Добавляем обработчик для кнопки продолжить
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.nextExercise();
            });
        }

        document.getElementById('check-btn').style.display = 'none';
    }

    showAdvancedReview(exercise, content) {
        content.innerHTML = `
            <div class="advanced-review">
                <div class="review-header">
                    <div class="review-icon">📋</div>
                    <h2>${exercise.title}</h2>
                </div>
                
                <div class="topics-grid">
                    ${exercise.topics.map(topic => `
                        <div class="topic-card">
                            <div class="topic-icon">${topic.icon}</div>
                            <div class="topic-title">${topic.title}</div>
                            <div class="topic-description">${topic.description}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="review-actions">
                    <button id="continue-btn" class="btn btn-primary">Продолжить к экзамену</button>
                </div>
            </div>
        `;

        document.getElementById('check-btn').style.display = 'none';
    }

    showAdvancedFinalExam(exercise, content) {
        content.innerHTML = `
            <div class="advanced-final-exam">
                <div class="exam-header">
                    <div class="exam-icon">🏆</div>
                    <h2>${exercise.question}</h2>
                    <p>${exercise.description}</p>
                </div>
                
                <div class="exam-start">
                    <div class="exam-info">
                        <div class="info-item">
                            <span class="info-icon">📝</span>
                            <span>10 вопросов по всем темам</span>
                        </div>
                        <div class="info-item">
                            <span class="info-icon">⏱️</span>
                            <span>Без ограничения времени</span>
                        </div>
                        <div class="info-item">
                            <span class="info-icon">🎯</span>
                            <span>Нужно 70% для прохождения</span>
                        </div>
                    </div>
                    
                    <button id="start-exam-btn" class="btn btn-primary exam-btn">Начать экзамен</button>
                </div>
                
                <div class="achievement-preview">
                    <div class="achievement-text">${exercise.achievement}</div>
                </div>
            </div>
        `;

        // Добавляем обработчик для кнопки начала экзамена
        const startBtn = content.querySelector('#start-exam-btn');
        startBtn.addEventListener('click', () => {
            this.nextExercise();
        });

        // Добавляем обработчик для кнопки продолжить
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.nextExercise();
            });
        }

        document.getElementById('check-btn').style.display = 'none';
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.app = new iLearnEnglishApp();
});

// Обработка событий Telegram WebApp
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.saveProgress();
    }
}); 