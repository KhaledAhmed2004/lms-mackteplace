Экран "Вход" - Стартовый экран если пользователь не аутентифицирован 
1.1. Логин/Пароль, кнопка Войти, оба поля обязательны для заполнения, При ошибке - 
вывести сообщение внизу в красном боксе, смотри Design экран "Вход" 
1.2. Ссылка Зарегистрироваться - ведет на экран 2 "Регистрация"  
1.3. Ссылка "Забыли пароль?" - Ведет на экран "Забыли пароль"+ 
2. Экран "Регистрация" 
Два переключателя RadioButton: 
2.1. Клиент, desing Pages (Мобильная версия) -        
2.2. Эксперт, https://websmartcons.com/signup/ radio_button "Эксперт" 
3. Экран "Забыли пароль" 
3.1. Стиль такой же как на Экране "Вход" 
3.2. Поле для ввода email - валидация required + email 
3.3. При ошибке вывод сообщения в красный бокс как на экране "Вход" 
После входа 
4. Header -  
4.1. Слева название Экрана 
4.2. Справа Кнопка "Лупа" - раскрывает поле ввода для строки поиска вместо всего 
header (Design - , Аватар с фото пользователя - при клике ведет на странице Личный 
кабинет 
4. Нижнее меню  
4.1. Эксперты ведет на экран 5 - Активно по умолчанию 
4.2. Материалы - пока задисейблен 
4.3. Кнопка "Plus" открывает всплывающее окно, (можно BottomSheet), 3 меню, как на 
дизайне, пока все засейблены 
4.4. Кнопка "Консультации" Ведет на Экран "Консультации" 
4.5. Кнопка "Вопросы" -  пока задисейбена 
5. Список Экспертов - клик на записи Эксперта ведет на экран 5 - Стартовый экран 
если пользователь аутентифицирован 
5.1. В ExpertListItem выводим Avatar, Surname, FirstName, рейтинг эксперта, кол-во 
отзывов на эксперта,кол-во статей, написанных экспертом, количество опросов где 
принимает участие Эксперт, категории экспертности, поле About (2 строчки, ~ 100 
символов), Стоимость консультации 
5.2. Клик на записе эксперта ведет на Карточку Эксперта 6, 
5.2. Кнопка Консультация - ведет на экран 8 
5.2. Кнопка Фильтр - статичная (не прокручивается), открывает BottomSheet с 
параметрами фильтрации Категория (Списком, SelectOne), рейтинг Эксперта (Списком, 
SelectOne) и ниже раздел 
6. Карточка Эксперта 
6.1. Отображаем Аватар, рейтин, Категории, кол-во статей эксперта, кол-во опросов, 
кол-во отзывов, количество ответов 
6.2. Кнопка "консультации" ведет на страницу 8 
6.3. Отображаем поле "Образование"  
6.4. Отображаем поле "Опыт" 
6.5. Отображаем поле About 
6.6. Отображаем поле "стоимость консультации" 
6.7. Горизонтальный скролл с вкладками Исследования(при переходе отображаем 
пустой список), Статьи(при переходе отображаем пустой список), Вопросы(при 
переходе отображаем пустой список), Отзывы (делаем активной по умолчанию), 
Проекты 
6.8. Вкладка отзывы - Отзывы об эксперте, infinity list  
6.9. Вкладка Проекты - проекты Эксперта, infinity list, дизайн будет предоставлен 
6.10. При скролле вниз карточка эксперта минимизируется, закреплены  вкладки 6.7., 
кнопка Консультация перемещается вниз и закрепляется там, оставляю максимальное 
место для контента вкладок 
Клиент 
7. Личный кабинет  
7.1. Просмотр, Аватар, Имя, Фамилия, тип пользователя - Клиент, часовой пояс, кнопки 
"Настройка профиля"  "Выйти" 
7.2. Редактирование 
7.2.2. Аватар, с возможностью изменить фото 
7.2.3. Имя - Текстовое поле, проверка на обязательность ввода 
7.2.4. Фамилия - Текстовое поле, проекта на обязательность 
7.2.5 Текущий часовой пояс, при клике появляется модальное окно со списком 
значений, при выборе значения модальное окно закрывается и устанавливается новое 
значение 
7.2.6. Кнопка "Сохранить изменения" - фиксация всех изменений 
7.2.7. Кнопка "Изменить пароль", - Три поля ввода, Текущий пароль, Новый Пароль, 
Подтверждение пароля, требования по заполнению - все поля обязательны, новый 
пароль и подтверждение должны совпадать, новый пароль должен быть не менее 8 
символов, содержать строчные и прописные букры и хотя бы 1 цифру 
7.2.8. Кнопка "Удалить профиль", при нажатии выезжает (Модальное окно - 
подтверждение, с Заголовком "Вы действительно хотите удалить профиль? После 
удаления у вас будет возможность восстановить профиль в течение 90 дней, после 90 
дней профиль будет удален безвозвратно"), две кнопки - Удалить, Отмена 
8. Бронирование 
8.1. Информация об эксперте, в минимизированном виде 
8.2. Календарь с возможностью выбора даты, прошедшие дни и недоступные для 
бронирования задисейбленны и недоступны для выбора (Информация подтягивается с 
сервера) 
8.3. После выбора даты, становится доступным выбор времени ( до этого компонент 
задисейблен), при выборе даты необходимо запросить с сервера актуальные слоты по 
времени и отобразить их, недоступные задисеблены 
8.4. Комментарий ко встрече (необязательно) 
8.5. Выбор категории по которой будет проводится консультация (получаем категории 
эксперта) 
8.6. После ввода всех параметров выводим всю информацию по встрече и кнопка 
"Записаться" становится доступной 
8.7. При нажатии на кнопку необходимо обработать ответ, если бронирование 
произошло неуспешно, например слот уже заняли пока происходило бронирование то 
вывести сообщение внизу в боксе     
 
 
9. Чекаут 
9.1. После успешного бронирования переходим на страницу Чекаут, выводим 
информацию о бронировании и статус с кнопкой оплатить и таймером обратного 
отсчёта (минуты и секунды) - время получить настройкой с сервера, в течение которого 
слот закрепляется за пользователем,  
9.2. Кнопка "Оплатить позже" - переход на страницу 10, 
9.3. при нажатии на кнопку "Оплатить"(два способа оплаты, две кнопки),  отправляется 
запрос на бекэнд сервер с параметрами. Cервер создает платеж в системе и 
возвращает чекаут ссылку мобильному приложению.  Мобильное приложение 
открывает ссылку чекаута, пользователь совершает оплату и возвращается на 
страницу чекаута 9.1, приложение при этом показывает ActivityIndicator и запускает 
поллинг статуса оплаты на бекэнд сервер, 
9.4. При получение ответа от сервера об успешной операции, приложение переходит 
на странице "Консультация оплачена успешно" 
9.5. При получении иного статуса переходим на страницу "Что-то пошло не так с 
оплатой"  
9.6. Кнопки "Оплатить позже" и "Отмена" Ведут на страницу "Список консультаций" 10
  
                                            
10. Список консультаций 
Представление Месяц 
10.1. Может открыть из основного меню снизу кнопка "Консультации" 
10.2. Показываем легенду - цвет/статус 
10.2.1.Зеленый - оплаченные 
10.2.2.Красный - требуется оплата 
10.2.3.Серый - Завершенные 
10.2.4. Коричневый - отмененные 
10.3. Календарь должен иметь возможность пролистываться вперед помесячно ( 4 
месяца вперед от текущего месяца), при смене месяца нужно перезапрашивать 
данные о бронированиях за выбранный период (месяц)   
10.4  Прошедшие и выходные дни задисейблены и по ним нельзя нажать 
10.5. Информация по рабочим/выходным дням получается с бекэнд сервера 
10.6. Информация о бронированиях получается с бекэнд сервера 
10.7. В правом верхнем углу клетки дня отображается кол-во бронирований за день   
10.8. Цвет фона определяется по логике 
 - Если все бронирования за день прошедшие  - значит серый 
 - Если все бронирования за день оплачены - значит зеленый 
 - Иначе красный                        
10.9 При выборе дня в календаре даты ниже календаря необходимо вывести записи 
на выбранный день в списке (Список с прокруткой) 
10.10. При клике на запись показать детали записи в BottomSheet, 
10.11 В зависимости от роли пользователя, статуса бронирования и даты(+время) 
показать: 
10.11.1. Эксперт видит только кнопку "Подключится", она должна  быть 
задисейблена  - - - 
если время бронирования прошло 
если бронирования не наступило 
если бронирование не оплачено.  
Эксперт может "Отменить" неоплаченную запись (не позже чем за 2 часа до 
времени бронировая) (в таком случае будет совершен возврат денежных средств 
клиенту) 
Эксперт не совершает “Подтверждение” или “отклонение”. Если бронирование 
было создано и оплачено он может отменить либо должен провести консультацию 
Клиент видит таймер обратного отсчета если время на оплату еще не истекло, 
Если время на оплату истекло и оплата не совершена то такая бронь исчезает для 
клиента. Клиент видит кнопку оплатить и кнопку оплатить позже пока не закончился 
таймер 
Клиент видит кнопку "Подключится" 
Кнопка задисейблена  - 
если дата прошла,  - 
если бронирование оплачено и дата время бронирования более 10 
минут до начала 
Клиент может “Отменить” бронирование за 2 часа до его начала, например 
бронирование стоит на 17 00, в 14 00 клиент может совершить отмену, в 15 00 и позже 
не может тк до времени консультации осталось менее 2 часов. При отмене клиент 
получает деньги за бронирование обратно 
Клиент может  Перенести бронирование за 2 часа до его начала, При нажатии 
на кнопку отмена  Открывается BottomSheet как при обычном бронировании но с уже 
заполненными текущими данными параметрами бронирования, которые можно 
изменить, если бронирование было оплачено то просто сохраняем новые данные и 
выводим уведомление об успешном сохранении, Если бронирование не было 
оплачено то выставляем таймер на  оплату после изменения параметров      
После того как пользователь нажмет “Отменить” появляется окно 
подтверждения отмены записи BottomSheet, с кнопками "Подтвердить отмену" и 
"Отмена". Отмена закрывает BottomSheet. "Подтвердить отмену" делает вызов на 
бекэнд сервер и после успешного ответа показывает Экран с успешным 
подтверждением отмены, сообщение об возврате оплаты нужно получить в ответе от 
сервера и вывести в окно BottomSheet 
Представление Неделя 
10.12. Все тоже самое что и в представлении Месяц но календарь месяца меняется на 
календарь недели 
10.13. По умолчанию в сетке ничего не выбрано, внизу отображается весь список 
бронирования на неделю (Список с прокруткой) 
10.14. В сетке выбирается конкретный час дня , те список внизу фильтруется этим 
днем 
10.15. При клике на записи происходит все тоже самое что и в списке в представлении 
месяц      
10.16. Вверху есть переключатель дат по неделям, при переключении запрашиваются 
данные о бронированиях с сервера 
Представление "День"                                                                          
10.17. в периоде указываем текущую дату, переключатель периода по дням 
10.18 отображаем все бронирования на текущий день 
10.19.  Добавляем фильтр "Активные(Оплаченные)/Завершенные" 
10.20.  Фильтр может быть не выбран, в таком случае выводим все записи на текущий 
день 
10.21. Вверху есть переключатель Календарь/Список 
10.22. Календарь переключает на вкладку календаря с возможностью выбрать один из 
трех представлений 
10.23. Список сразу показывает компонент календаря - текущий день без возможности 
смены даты     
Эксперт   
11.Личный кабинет     
11.1. Личный кабинет Эксперта выглядит как и карточка Эксперта только вместо кнопки 
консультация - кнопки “Настройка профиля” и “Выйти”  
11.1.1. Данные для личного кабинета работают с сущностью Анкета. - отдельный API                             
11.2. В режиме редактирования личных данных все поля доступны для редактирования 
11.2.1.  Имя, Фамилия -  Текстовый ввод 
11.2.2. О себе - TextArea с возможностью минимального редактирования Текст (bold, 
cursive underline)   список (точки и цифры) 
11.2.3. Фото - отображаем текущее если оно есть либо аватар (no foto) с возможностью 
выбора другого фото 
11.2.4. Категории экспертности - выпадающий список с возможностью выбрать 
несколько (данные о существующих категориях получаем с сервера) 
11.2.4. Опыт (лет) - поле ввода, только цифры 
11.2.5 Цена - поле ввода, только цифры - сделать ограничение по мин и макс вводу 
(мин и макс получаем с сервера) 
11.2.6 Возраст - поле ввода только цифры 
11.2.7. Ссылка на HeadHunter - поле ввода текст - будет ввод ссылки 
11.2.8. Ссылка на LinkedIn - поле ввода текст - будет ввод ссылки 
11.2.9  Образование - список из сущностей с полями 
11.2.9.1  Тип образования - список со значениями (Основное, Дополнительное) 
11.2.9.2 Специализированное образование - чекбокс 
11.2.9.3 Образовательное учреждение - текстовое поле ввода 
11.2.9.3 Номер диплома - текстовое поле ввода 
В случае сохранения Экспертом данных они требуют проверки чтобы отобразится в 
анкете, Поэтому пока они не проверены необходимо в самом верху отобразить 
информационное сообщение Ваши данные не верифицированы  
Данное сообщение должно быть показано на всех страницах приложения если есть не 
верифицированные данные 
12. Расписание работы 
12.1. На странице Консультации в самом верху есть шестеренка при нажатии на 
которую появляется BottomSheet с настройкой основного расписания 
12.2 На основном расписании можно указать часовой пояс в котором работает Эксперт - должен быть выпадающий список  (получаем с backEnd сервера) 
12.3 На основном расписании список из строк для каждого дня недели. В строке: 
12.3.1 Чекбокс для выбора дня (Если не выбрано то вся стройка дисейблиться) 
12.3.2 Название дня 
12.3.3 Поле - выпадающий список для выбора времени начала рабочего (получаем с 
сервера) 
12.3.4 Поле - выпадающий список для выбора времени окончания рабочего дня 
(получаем с сервера) 
12.3.5 Время окончания рабочего дня не может быть больше или равно времени 
начала 
12.4 При Нажатии и удерживании на дне в календаре появляется BottomSheet  
дополнительного расписания.Внутри список из строк с возможностью добавить строчку 
12.4.1 Строчка состоит из  
12.4.1.1 Выпадающий список со значениями Работаю/Не работаю 
12.4.1.2 Поле ввода времени начала интервала 
12.4.1.3 Поле ввода времени окончания интервала 
12.4.1.4 Кнопки удалить интервал 
12.4.2  В случае наличия на дате дополнительного расписания отобразить это таким 
же элементом в правом нижнем углу (светло синего цвета) как и для кол-ва  
консультаций 
Figma materials 
https://www.figma.com/design/kE4VRYsvj2lAJvLVwPICfm/Portal-BI--Copy-?node-id=0-1&p=
f&t=bURLOwKw9JqmMJ6R-0 
Section - “Мобильная версия” - contains public part of common part of app 
Section “New” contains all parts related booking checkout calendar payment  
There is no screen for registration of Expert in figma file 
You can see expert registration screen on web site for this app  https://websmartcons.com/ 
1. Login Screen 
The start screen if the user is not authenticated. 
1.1. Login/Password fields, “Login” button — both fields are required. 
On error — show the error message in a red box at the bottom (see “Login” design). 
1.2. “Register” link → navigates to screen 2 “Registration”. 
1.3. “Forgot password?” link → navigates to screen “Forgot password”. 
2. Registration Screen 
Two RadioButtons: 
2.1. Client — based on design “Pages (Mobile version)”. 
2.2. Expert — based on https://websmartcons.com/signup/ radio button “Expert”. 
3. Forgot Password Screen 
3.1. The same style as the Login screen. 
3.2. Email input field — validation: required + email format. 
3.3. On error — show message in a red box (same as Login screen). 
After Login 
4. Header 
4.1. Left: Screen title. 
4.2. Right: Search icon — expands into a search input replacing the entire header (see 
design). 
User avatar → opens Profile page. 
4. Bottom Menu 
4.1. “Experts” — leads to screen 5 (active by default). 
4.2. “Materials” — disabled for now. 
4.3. “Plus” button → opens a modal (BottomSheet) with 3 menu items (all disabled for now). 
4.4. “Consultations” → leads to Consultations screen. 
4.5. “Questions” — disabled for now. 
5. Experts List 
Clicking on an expert opens screen 6 (Expert Card). 
Each ExpertListItem displays: 
5.1. Avatar, Surname, FirstName, expert rating, number of reviews, number of articles 
written by the expert, number of surveys the expert participates in, expertise categories, 
“About” field (2 lines, ~100 chars), consultation price. 
5.2. Clicking the expert → Expert Card (screen 6). 
5.2. “Consultation” button → leads to screen 8. 
5.2. “Filter” button → static (not scrollable), opens BottomSheet with filtering options: 
● Category (SelectOne) 
● Expert rating (SelectOne) 
● plus additional sections 
6. Expert Card 
6.1. Display: Avatar, rating, categories, article count, survey count, review count, answer 
count. 
6.2. “Consultations” button → leads to screen 8. 
6.3. Show: Education 
6.4. Experience 
6.5. About 
6.6. Consultation price 
6.7. Horizontal tabs: Research (empty), Articles (empty), Questions (empty), Reviews 
(default active), Projects. 
6.8. Reviews tab – infinite list. 
6.9. Projects tab – infinite list (design to be provided). 
6.10. On scroll down, the expert card collapses, tabs remain sticky, “Consultation” button 
moves to bottom and stays fixed to maximize content space. 
Client Features 
7. Personal Account 
7.1. View Mode 
Shows: 
● Avatar 
● First/Last name 
● User type — Client 
● Time zone 
● “Edit Profile” and “Logout” buttons 
7.2. Edit Mode 
7.2.2. Avatar — can change the photo. 
7.2.3. First name — required. 
7.2.4. Last name — required. 
7.2.5. Time zone — modal list, selecting closes modal and updates value. 
7.2.6. “Save changes” — saves all edits. 
7.2.7. “Change password” — 3 fields: Current password, New password, Confirm password. 
Validation: 
● All fields required 
● New password = Confirm password 
● New password ≥ 8 chars, includes upper/lowercase letters and at least one digit 
7.2.8. “Delete profile” — confirmation modal: 
“You really want to delete your profile? You can restore your profile within 90 days. After 90 
days it will be permanently deleted.” 
Buttons: Delete / Cancel. 
8. Booking 
8.1. Expert info (collapsed view). 
8.2. Calendar with selectable dates; past and unavailable dates are disabled (from 
backend). 
8.3. After selecting a date → time slot selector becomes active. Fetch available time slots 
from backend. Disabled if unavailable. 
8.4. Optional comment. 
8.5. Select consultation category (expert’s categories). 
8.6. When all fields are filled, show summary and enable “Book” button. 
8.7. If booking fails (e.g., slot already taken), show error message in a red box. 
9. Checkout 
9.1. After successful booking → Checkout screen with booking info, status, payment button, 
countdown timer (minutes/seconds, configurable from server). 
9.2. “Pay later” → screen 10. 
9.3. Pressing “Pay” (two payment options) → send request to backend → backend creates 
payment and returns checkout link → app opens the link → after payment returns back to 
Checkout 9.1 → app shows a loader and polls backend for payment status. 
9.4. On successful payment → go to “Payment successful” page. 
9.5. On failed status → go to “Something went wrong with the payment”. 
9.6. “Pay later” and “Cancel” → go to Consultations list (screen 10). 
10. Consultations List 
Month View 
10.1. Opened via bottom menu. 
10.2. Legend: 
● Green — paid 
● Red — requires payment 
● Gray — completed 
● Brown — cancelled 
10.3. Calendar can scroll forward up to 4 months; on month change → fetch bookings for 
that month. 
10.4. Past days and weekends are disabled. 
10.5. Working/non-working days → backend. 
10.6. Bookings → backend. 
10.7. Each day cell shows number of bookings. 
10.8. Background color rules: 
● All bookings in the past → gray 
● All bookings paid → green 
● Otherwise → red 
10.9. When selecting a day → show the list of bookings below (scrollable). 
10.10. On click → open booking details in BottomSheet. 
10.11. Buttons and logic depend on: 
● user role (Expert/Client) 
● booking status 
● date/time 
10.11.1. Expert sees: 
● “Join” button (disabled if: time passed, event not started, not paid). 
● Expert can cancel an unpaid booking (no later than 2 hours before start). 
● Expert does NOT confirm/decline bookings — if it is created & paid, expert must 
either hold the consultation or cancel (with refund). 
10.11.2. Client sees: 
● Countdown timer if payment window active. 
● If payment window expired & unpaid → booking disappears. 
● Buttons: “Pay”, “Pay later”. 
● “Join” button (disabled if date passed or more than 10 min before start). 
● Client can cancel a booking ≥2 hours before start → refund. 
● Client can reschedule booking ≥2 hours before start: 
○ Opens BottomSheet like the booking flow, pre-filled with current data. 
○ If paid → just save new data and show success notification. 
○ If unpaid → set new payment timer. 
After pressing “Cancel”: 
BottomSheet confirmation → Confirm / Cancel. 
On confirm → call backend → show success screen with refund info (from backend). 
Week View 
10.12. Same functionality as Month View, but calendar is weekly. 
10.13. By default — nothing selected, below shows all bookings of the week. 
10.14. Selecting a cell filters the list by that day. 
10.15. Clicking an entry → same logic as Month View. 
10.16. Week switcher at the top → fetch bookings for selected week. 
Day View 
10.17. Shows current date; navigation by day. 
10.18. Shows all bookings for the current day. 
10.19. Filter “Active(Paid)/Completed”. 
10.20. If filter is not selected → show all. 
10.21. Switcher Calendar/List. 
10.22. Calendar → goes to Calendar tab (Month/Week/Day). 
10.23. List → shows only current day without date switching. 
Expert 
11. Personal Account 
11.1. Expert’s Personal Account is the same as Expert Card, but instead of “Consultation”: 
● “Edit Profile” 
● “Logout” 
11.1.1. Expert profile data uses the “Questionnaire” entity (separate API). 
11.2. Edit Mode 
11.2.1. First/Last Name — text input. 
11.2.2. About — TextArea with small formatting (bold, italic, underline, bullets, numbers). 
11.2.3. Photo — current photo or placeholder with ability to change. 
11.2.4. Expertise categories — multi-select (data from backend). 
11.2.4. Experience (years) — numbers only. 
11.2.5. Price — numbers only, min/max limits from backend. 
11.2.6. Age — numbers only. 
11.2.7. HeadHunter link — text input. 
11.2.8. LinkedIn link — text input. 
11.2.9. Education List 
Each entry includes: 
11.2.9.1. Education type — (Basic, Additional). 
11.2.9.2. Specialized education — checkbox. 
11.2.9.3. Institution — text input. 
11.2.9.3. Diploma number — text input. 
Verification Notice 
If expert’s updated data is pending verification — show message at the top: 
“Your data is not verified.” 
This must be shown on all pages if there is unverified data. 
12. Work Schedule 
12.1. On the Consultations page, at the top, a gear icon opens BottomSheet with main 
schedule settings. 
12.2. Select time zone — dropdown list (from backend). 
12.3. Weekly schedule — 7 rows: 
12.3.1. Checkbox for enabling the day (if unchecked → entire row is disabled). 
12.3.2. Day name. 
12.3.3. Dropdown for start time (from backend). 
12.3.4. Dropdown for end time (from backend). 
12.3.5. End time cannot be ≤ start time. 
12.4. Additional Schedule 
Long-pressing a date in the calendar opens a BottomSheet with additional schedule entries. 
List of rows with ability to add new rows: 
Each row includes: 
12.4.1.1. Status dropdown: Working / Not working 
12.4.1.2. Start time input 
12.4.1.3. End time input 
12.4.1.4. Delete button 
SMARTCONSULT — API SPECIFICATION 
(FULL DOCUMENT, ENGLISH VERSION) 
Version: Final (all corrections applied) 
Project module excluded 
1. AUTHENTICATION 
1.1 POST /auth/login/ 
User authentication. 
Request (JSON) 
{ 
} 
"email": "string", 
"password": "string" 
Response 
{ 
} 
"access": "string", 
"refresh": "string" 
1.2 POST /auth/refresh/ 
Refresh access token. 
Request 
{ 
} 
"refresh": "string" 
Response 
{ 
} 
"access": "string" 
2. EXPERTS 
2.1 GET 
/experts?page=<integer>&limit=<integer>&search=<stri
ng>&category=<integer>&rating=<integer> 
Retrieve a paginated list of experts with optional filters. 
Query parameters 
Parameter Type 
page 
Description 
integer page number 
limit 
integer items per page 
search string search by name 
category integer filter by category 
rating integer filter by minimum rating 
Response 
{ 
  "count": integer, 
  "page": integer, 
  "results": [ 
    { 
      "id": integer, 
      "first_name": "string", 
      "last_name": "string", 
      "avatar": "string|null", 
      "category": "string", 
      "rating": number, 
      "price_per_hour": number 
    } 
  ] 
} 
 
 
2.2 GET /experts/{id} 
Retrieve detailed expert information. 
Projects are not included. 
Response 
{ 
} 
"id": integer, 
"first_name": "string", 
"last_name": "string", 
"avatar": "string|null", 
"category": "string", 
"rating": number, 
"price_per_hour": number, 
"description": "string" 
3. APPOINTMENTS 
3.1 GET 
/appointments/calendar/expert/json?start=<ISO8601>&
end=<ISO8601>&expert_id=<int> 
Retrieve expert's calendar data for a selected period. 
Query parameters 
Parameter Type Description 
start ISO8601 string period start 
date 
end ISO8601 string period end date 
expert_i
d 
integer expert ID 
Response 
{ 
  "data": { 
    "appointments": { 
      "as_expert": [ /* AppointmentSerializer format */ ], 
      "as_client": [ /* AppointmentSerializer format */ ] 
    }, 
    "extra_dates": [ 
      { 
        "id": integer, 
        "start": "YYYY-MM-DD HH:MM", 
        "end": "YYYY-MM-DD HH:MM", 
        "type": integer 
      } 
    ], 
    "schedule": [ 
      { 
        "start": "YYYY-MM-DD HH:MM", 
        "end": "YYYY-MM-DD HH:MM" 
      } 
    ] 
  } 
} 
 
 
3.2 GET /appointments/calendar/client/json 
Retrieve upcoming client consultations. 
Response example (real format) 
{ 
  "data": { 
    "appointments": { 
      "as_client": [ 
        { 
          "id": integer, 
          "localized_appointment_datetime": "YYYY-MM-DD HH:MM", 
          "client": { 
            "id": integer, 
            "first_name": "string", 
            "last_name": "string" 
          }, 
          "expert": { 
            "id": integer, 
            "first_name": "string", 
            "last_name": "string" 
          }, 
          "status": integer, 
          "created_time": "ISO8601", 
          "zoom_link": "string|null" 
        } 
      ] 
    } 
  } 
} 
 
 
3.3 GET 
/appointment/available/timeslots/json?expert_id=<id>&
selected_date=YYYY-MM-DD 
Returns available time slots for a selected date. 
Response 
[ 
  "09:00", 
  "10:00", 
  "11:00", 
  "12:00", 
  "13:00" 
] 
 
 
3.4 POST /appointments/calendar/add/schedule/ 
Set expert's weekly schedule (7 days). 
Request 
{ 
  "workdays": [ 
    { 
      "day_of_week": integer,      // 1–7 
      "is_work_day": boolean, 
      "start_time": "HH:MM", 
      "end_time": "HH:MM" 
    } 
  ] 
} 
 
Response 
{ 
  "result": "success" 
} 
 
3.5 POST /appointments/calendar/add/range/ 
Add an extra working or non-working time range. 
Request 
{ 
} 
"start": "DD.MM.YYYY HH:MM", 
"end": "DD.MM.YYYY HH:MM", 
"type": integer   // 1 = non-working, 0 = working 
Response 
{ 
} 
"result": "success" 
3.6 POST /appointments/add/{expert_id} 
Create an appointment. 
Request (form-data) 
appointment_date=YYYY-MM-DD 
appointment_time=HH:MM 
notes=string 
expert=integer 
Response 
{ 
} 
"result": "success", 
"appointment_id": integer 
3.7 POST /appointments/edit/{appointment_id} 
Edit an appointment. 
Expert cannot be changed. 
Request 
appointment_date=YYYY-MM-DD 
appointment_time=HH:MM 
notes=string 
Response 
{ 
} 
"result": "success" 
3.8 DELETE /appointments/delete/{appointment_id} 
Cancel an appointment. 
Response 
{ 
"result": "success" 
} 
3.9 POST /appointments/rate/{appointment_id} 
Rate a completed consultation. 
Request 
{ 
} 
"rating": integer, 
"review": "string" 
Response 
{ 
} 
"result": "success" 
4. PAYMENTS 
4.1 POST /appointments/checkout/{appointment_id} 
Start the payment process. 
Request 
{ 
} 
"payment_provider": "string" 
Response 
{ 
} 
"checkout_url": "string" 
4.2 POST /payment/{payment_provider}/callback/ 
Callback from payment provider. 
Response 
{ 
} 
"result": "success" 
4.3 GET /payment/status/{appointment_id} 
Check payment status. 
Response 
{ 
"status": "string"   // paid, unpaid, failed, pending 
} 
 
 
 