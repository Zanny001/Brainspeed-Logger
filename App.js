import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

// ==========================================
// ENVIRONMENT CONFIGURATION
// ==========================================
const RENDER_API_URL = 'https://hour-logger-5t73.onrender.com/api';

// ==========================================
// DYNAMIC THEME ENGINE (Match HTML Specs)
// ==========================================
const THEMES = {
  light: {
    primary: '#635BFF',
    primaryHover: '#0A2540',
    bg: '#F6F9FC',
    cardBg: '#FFFFFF',
    text: '#1A1F36',
    border: '#E3E8EE',
    textMuted: '#4F566B',
  },
  dark: {
    primary: '#7770FF',
    primaryHover: '#FFFFFF',
    bg: '#0A2540',
    cardBg: '#102A43',
    text: '#F4F6F8',
    border: '#243B53',
    textMuted: '#9FB3C8',
  },
};

export default function App() {
  // Global View State
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? THEMES.dark : THEMES.light;
  const [currentScreen, setCurrentScreen] = useState('LOGIN');
  const [loading, setLoading] = useState(false);

  // Auth Context
  const [userContext, setUserContext] = useState({ id: null, username: '', role: '' });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [role, setRole] = useState('teacher');

  // Application Data
  const [allUsers, setAllUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Profile State
  const [profile, setProfile] = useState({ bio: '', subjects: '', class_level: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Admin Finance Filters
  const [adminBillingStudent, setAdminBillingStudent] = useState('ALL');
  const [adminPayoutTeacher, setAdminPayoutTeacher] = useState('ALL');

  // Logging Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [logSubject, setLogSubject] = useState('');
  const [logHours, setLogHours] = useState('');

  // --- API DATA SYNCHRONIZATION ---
  const syncApplicationData = useCallback(async () => {
    if (!userContext.id) return;
    try {
      // 1. Fetch Profile Data (for Student/Teacher)
      if (userContext.role !== 'admin') {
        const profRes = await fetch(`${RENDER_API_URL}/profile/${userContext.id}`);
        if (profRes.ok) {
          const profData = await profRes.json();
          setProfile({ bio: profData.bio || '', subjects: profData.subjects || '', class_level: profData.class_level || '' });
        }
      }

      // 2. Fetch Users Lists
      if (userContext.role === 'admin') {
        const usersRes = await fetch(`${RENDER_API_URL}/users`);
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setAllUsers(usersData);
          setStudents(usersData.filter(u => u.role === 'student'));
          setTeachers(usersData.filter(u => u.role === 'teacher'));
        }
      } else if (userContext.role === 'teacher') {
        const studentRes = await fetch(`${RENDER_API_URL}/users/student`);
        if (studentRes.ok) {
          const studentData = await studentRes.json();
          setStudents(studentData);
          if (studentData.length > 0 && !selectedStudentId) setSelectedStudentId(studentData[0].id.toString());
        }
      }

      // 3. Fetch Sessions
      let sessionEndpoint = `${RENDER_API_URL}/sessions`;
      if (userContext.role === 'student') sessionEndpoint = `${RENDER_API_URL}/sessions/student/${userContext.id}`;
      if (userContext.role === 'teacher') sessionEndpoint = `${RENDER_API_URL}/sessions/teacher/${userContext.id}`;

      const sessionRes = await fetch(sessionEndpoint);
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        setSessions(sessionData);
      }
    } catch (err) {
      console.warn('Network unreachable. Data sync failed.');
    }
  }, [userContext, selectedStudentId]);

  useEffect(() => {
    if (['ADMIN', 'TEACHER', 'STUDENT'].includes(currentScreen)) {
      syncApplicationData();
    }
  }, [currentScreen, syncApplicationData]);

  // --- AUTHENTICATION DISPATCHERS ---
  const executeAuthLogin = async () => {
    if (!username || !password) return Alert.alert('Error', 'Fields required.');
    setLoading(true);
    const cleanUser = username.toLowerCase().trim();

    try {
      const response = await fetch(`${RENDER_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password }),
      });
      const data = await response.json();
      setLoading(false);
      
      if (data.status === 'success') {
        setUserContext({ id: data.user_id, username: data.username, role: data.role });
        setCurrentScreen(data.role.toUpperCase());
        setUsername('');
        setPassword('');
      } else {
        Alert.alert('Authentication Failed', data.message || 'Invalid credentials');
      }
    } catch (e) {
      setLoading(false);
      Alert.alert('Network Error', 'Cannot reach Brainspeed API.');
    }
  };

  const executeAuthSignup = async () => {
    if (!username || !password) return Alert.alert('Error', 'Fill all fields.');
    setLoading(true);
    const cleanUser = username.toLowerCase().trim();
    
    try {
      const response = await fetch(`${RENDER_API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password, role }),
      });
      const data = await response.json();
      setLoading(false);

      if (data.status === 'success') {
        Alert.alert('Success', 'Account created!');
        setCurrentScreen('LOGIN');
      } else {
        Alert.alert('Registration Error', data.message || 'Username exists');
      }
    } catch {
      setLoading(false);
      Alert.alert('Network Error', 'Cannot reach Brainspeed API.');
    }
  };

  const executePasswordReset = async () => {
    if (!username || !newPassword) return Alert.alert('Error', 'Fill all fields');
    setLoading(true);
    
    try {
      const response = await fetch(`${RENDER_API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, new_password: newPassword }),
      });
      const data = await response.json();
      setLoading(false);

      if (data.status === 'success') {
        Alert.alert('Success', 'Password updated successfully.');
        setCurrentScreen('LOGIN');
      } else {
        Alert.alert('Error', data.message || 'Update failed');
      }
    } catch {
      setLoading(false);
      Alert.alert('API Warning', 'Reset endpoint not active on backend.');
    }
  };

  // --- CRUD DISPATCHERS ---
  const handleUpdateProfile = async () => {
    try {
      await fetch(`${RENDER_API_URL}/profile/${userContext.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      setIsEditingProfile(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  const handleCreateSession = async () => {
    if (!logSubject || !logHours) return Alert.alert('Error', 'Missing fields.');
    try {
      const payload = {
        teacher_id: userContext.id,
        student_id: parseInt(selectedStudentId),
        subject: logSubject,
        session_date: new Date().toISOString().split('T')[0],
        check_in_time: '00:00',
        check_out_time: '00:00',
        hours: parseFloat(logHours),
        lat: 0.0,
        lng: 0.0
      };

      const res = await fetch(`${RENDER_API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        Alert.alert('Success', 'Session logged.');
        setLogSubject('');
        setLogHours('');
        syncApplicationData();
      }
    } catch {
      Alert.alert('Network Error', 'Failed to log session.');
    }
  };

  const handleAction = async (endpoint, method = 'PUT') => {
    try {
      await fetch(endpoint, { method });
      syncApplicationData();
    } catch {
      Alert.alert('Network Error', 'Operation failed.');
    }
  };

  // --- DYNAMIC STYLES GENERATOR ---
  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    workspace: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
    themeBtn: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : 20,
      right: 20,
      backgroundColor: theme.cardBg,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      zIndex: 10,
    },
    themeText: { color: theme.text, fontWeight: '600', fontSize: 13 },
    card: {
      backgroundColor: theme.cardBg,
      padding: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#32325d',
      shadowOffset: { width: 0, height: 15 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 35,
      elevation: 5,
      marginBottom: 20,
    },
    brand: { color: theme.primary, fontWeight: '800', fontSize: 24, marginBottom: 8, textAlign: 'center' },
    h3: { fontSize: 16, fontWeight: '500', color: theme.textMuted, marginBottom: 24, textAlign: 'center' },
    h3Left: { fontSize: 16, fontWeight: '500', color: theme.textMuted, marginBottom: 16 },
    input: {
      width: '100%',
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg,
      color: theme.text,
      borderRadius: 8,
      fontSize: 15,
    },
    pickerWrapper: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg,
      borderRadius: 8,
      marginBottom: 16,
      overflow: 'hidden',
    },
    button: {
      width: '100%',
      padding: 14,
      backgroundColor: theme.primary,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
    linksRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    linkText: { color: theme.primary, fontWeight: '500', fontSize: 14, marginHorizontal: 8 },
    dashboardTitle: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 20, marginTop: 60, textTransform: 'capitalize' },
    ledgerCard: {
      backgroundColor: theme.cardBg,
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
    },
    ledgerTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
    ledgerMeta: { color: theme.textMuted, fontSize: 13, marginTop: 4 },
    actionRow: { flexDirection: 'row', marginTop: 12, justifyContent: 'space-between' },
    badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: theme.bg },
    badgeText: { fontSize: 11, fontWeight: '700', color: theme.text },
    outlineBtn: { borderWidth: 1, borderColor: theme.primary, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
    outlineBtnText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
    deleteBtn: { backgroundColor: '#fee2e2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
    deleteText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },
    sectionHeader: { color: theme.text, fontSize: 18, fontWeight: '700', marginTop: 10, marginBottom: 10 },
  });

  // --- SUB-VIEWS ---
  const renderLogin = () => (
    <View style={s.card}>
      <Text style={s.brand}>Brainspeed International</Text>
      <Text style={s.h3}>Portal Management System</Text>
      <TextInput
        style={s.input}
        placeholder="Username"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={s.input}
        placeholder="Password"
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={s.button} onPress={executeAuthLogin}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Sign In</Text>}
      </TouchableOpacity>
      <View style={s.linksRow}>
        <TouchableOpacity onPress={() => setCurrentScreen('SIGNUP')}><Text style={s.linkText}>Sign Up</Text></TouchableOpacity>
        <Text style={{color: theme.textMuted}}>•</Text>
        <TouchableOpacity onPress={() => setCurrentScreen('RESET')}><Text style={s.linkText}>Reset Security</Text></TouchableOpacity>
      </View>
    </View>
  );

  const renderSignup = () => (
    <View style={s.card}>
      <Text style={s.brand}>Brainspeed International</Text>
      <Text style={s.h3}>Register Account</Text>
      <TextInput style={s.input} placeholder="Choose a Username" placeholderTextColor={theme.textMuted} autoCapitalize="none" value={username} onChangeText={setUsername} />
      <TextInput style={s.input} placeholder="Create Password" placeholderTextColor={theme.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
      <View style={s.pickerWrapper}>
        <Picker selectedValue={role} onValueChange={setRole} style={{ color: theme.text }}>
          <Picker.Item label="Student" value="student" />
          <Picker.Item label="Teacher" value="teacher" />
        </Picker>
      </View>
      <TouchableOpacity style={s.button} onPress={executeAuthSignup}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Create Account</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setCurrentScreen('LOGIN')} style={{ marginTop: 24, alignItems: 'center' }}>
        <Text style={s.linkText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReset = () => (
    <View style={s.card}>
      <Text style={[s.brand, {fontSize: 20}]}>Reset Password</Text>
      <TextInput style={s.input} placeholder="Your Username" placeholderTextColor={theme.textMuted} autoCapitalize="none" value={username} onChangeText={setUsername} />
      <TextInput style={s.input} placeholder="New Password" placeholderTextColor={theme.textMuted} secureTextEntry value={newPassword} onChangeText={setNewPassword} />
      <TouchableOpacity style={s.button} onPress={executePasswordReset}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Update Password</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setCurrentScreen('LOGIN')} style={{ marginTop: 24, alignItems: 'center' }}>
        <Text style={s.linkText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProfileSection = () => (
    <View style={s.card}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
        <Text style={[s.h3Left, {marginBottom: 0}]}>My Profile</Text>
        <TouchableOpacity onPress={() => isEditingProfile ? handleUpdateProfile() : setIsEditingProfile(true)}>
          <Text style={s.outlineBtnText}>{isEditingProfile ? 'Save' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>
      {isEditingProfile ? (
        <>
          <TextInput style={s.input} placeholder="Class Level" placeholderTextColor={theme.textMuted} value={profile.class_level} onChangeText={t => setProfile({...profile, class_level: t})} />
          <TextInput style={s.input} placeholder="Subjects" placeholderTextColor={theme.textMuted} value={profile.subjects} onChangeText={t => setProfile({...profile, subjects: t})} />
          <TextInput style={s.input} placeholder="Bio" placeholderTextColor={theme.textMuted} value={profile.bio} onChangeText={t => setProfile({...profile, bio: t})} multiline />
        </>
      ) : (
        <>
          <Text style={s.ledgerMeta}><Text style={{fontWeight: '700'}}>Class Level:</Text> {profile.class_level || 'N/A'}</Text>
          <Text style={s.ledgerMeta}><Text style={{fontWeight: '700'}}>Subjects:</Text> {profile.subjects || 'N/A'}</Text>
          <Text style={s.ledgerMeta}><Text style={{fontWeight: '700'}}>Bio:</Text> {profile.bio || 'N/A'}</Text>
        </>
      )}
    </View>
  );

  const renderDashboards = () => {
    // Admin filtering logic
    let displaySessions = sessions;
    if (currentScreen === 'ADMIN') {
      if (adminBillingStudent !== 'ALL') {
        displaySessions = displaySessions.filter(s => s.student_id === parseInt(adminBillingStudent));
      }
      if (adminPayoutTeacher !== 'ALL') {
        displaySessions = displaySessions.filter(s => s.teacher_id === parseInt(adminPayoutTeacher));
      }
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={s.dashboardTitle}>{userContext.username}'s Dashboard</Text>
        
        {/* Profile Views for Non-Admins */}
        {(currentScreen === 'TEACHER' || currentScreen === 'STUDENT') && renderProfileSection()}

        {/* Admin Tools */}
        {currentScreen === 'ADMIN' && (
          <>
            <View style={s.card}>
              <Text style={s.h3Left}>User Directory</Text>
              {allUsers.map(u => (
                <View key={u.id} style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border}}>
                  <Text style={{color: theme.text, fontWeight: '600'}}>{u.username}</Text>
                  <View style={s.badge}><Text style={s.badgeText}>{u.role.toUpperCase()}</Text></View>
                </View>
              ))}
            </View>

            <View style={s.card}>
              <Text style={s.h3Left}>Finance Tracking</Text>
              
              <Text style={s.ledgerMeta}>Filter by Student (Billing):</Text>
              <View style={s.pickerWrapper}>
                <Picker selectedValue={adminBillingStudent} onValueChange={(val) => {setAdminBillingStudent(val); setAdminPayoutTeacher('ALL');}} style={{ color: theme.text }}>
                  <Picker.Item label="All Students" value="ALL" />
                  {students.map(st => <Picker.Item key={st.id} label={st.username} value={st.id.toString()} />)}
                </Picker>
              </View>

              <Text style={s.ledgerMeta}>Filter by Teacher (Payout):</Text>
              <View style={s.pickerWrapper}>
                <Picker selectedValue={adminPayoutTeacher} onValueChange={(val) => {setAdminPayoutTeacher(val); setAdminBillingStudent('ALL');}} style={{ color: theme.text }}>
                  <Picker.Item label="All Teachers" value="ALL" />
                  {teachers.map(tc => <Picker.Item key={tc.id} label={tc.username} value={tc.id.toString()} />)}
                </Picker>
              </View>
            </View>
          </>
        )}
        
        {/* Teacher Logging Tool */}
        {currentScreen === 'TEACHER' && (
          <View style={s.card}>
            <Text style={s.h3Left}>Log New Session</Text>
            <View style={s.pickerWrapper}>
              <Picker selectedValue={selectedStudentId} onValueChange={setSelectedStudentId} style={{ color: theme.text }}>
                {students.map(s => <Picker.Item key={s.id} label={s.username} value={s.id.toString()} />)}
              </Picker>
            </View>
            <TextInput style={s.input} placeholder="Subject" placeholderTextColor={theme.textMuted} value={logSubject} onChangeText={setLogSubject} />
            <TextInput style={s.input} placeholder="Hours (e.g. 1.5)" placeholderTextColor={theme.textMuted} keyboardType="numeric" value={logHours} onChangeText={setLogHours} />
            <TouchableOpacity style={s.button} onPress={handleCreateSession}>
              <Text style={s.buttonText}>Commit Log</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={s.sectionHeader}>Session Ledger</Text>
        {displaySessions.length === 0 && <Text style={s.ledgerMeta}>No records found.</Text>}
        {displaySessions.map(item => (
          <View key={item.id} style={s.ledgerCard}>
            <Text style={s.ledgerTitle}>{item.subject}</Text>
            <Text style={s.ledgerMeta}>Date: {item.session_date} | Hrs: {item.hours}</Text>
            {(currentScreen === 'ADMIN' || currentScreen === 'TEACHER') && (
              <Text style={s.ledgerMeta}>Client: {item.student_name || 'N/A'}</Text>
            )}
            {(currentScreen === 'ADMIN' || currentScreen === 'STUDENT') && (
              <Text style={s.ledgerMeta}>Educator: {item.teacher_name || 'N/A'}</Text>
            )}
            
            <View style={s.actionRow}>
              <View style={{flexDirection: 'row', gap: 8}}>
                <View style={s.badge}><Text style={s.badgeText}>{item.status}</Text></View>
                <View style={s.badge}><Text style={s.badgeText}>{item.payment_status}</Text></View>
              </View>
              
              {currentScreen === 'ADMIN' && (
                <View style={{flexDirection: 'row', gap: 8}}>
                  {item.payment_status !== 'Paid' && (
                    <TouchableOpacity style={s.outlineBtn} onPress={() => handleAction(`${RENDER_API_URL}/sessions/${item.id}/pay`, 'PUT')}>
                      <Text style={s.outlineBtnText}>Mark Paid</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.deleteBtn} onPress={() => handleAction(`${RENDER_API_URL}/sessions/${item.id}`, 'DELETE')}>
                    <Text style={s.deleteText}>Purge</Text>
                  </TouchableOpacity>
                </View>
              )}

              {currentScreen === 'STUDENT' && item.status === 'Pending' && (
                <TouchableOpacity style={s.outlineBtn} onPress={() => handleAction(`${RENDER_API_URL}/sessions/${item.id}/confirm`, 'PUT')}>
                  <Text style={s.outlineBtnText}>Confirm Hours</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity onPress={() => {setUserContext({id:null}); setCurrentScreen('LOGIN');}} style={{ marginTop: 24, marginBottom: 40, alignItems: 'center' }}>
          <Text style={[s.outlineBtnText, {fontSize: 14}]}>Secure Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
      
      <TouchableOpacity style={s.themeBtn} onPress={() => setIsDark(!isDark)}>
        <Text style={s.themeText}>🌓 Theme</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.workspace}>
          {currentScreen === 'LOGIN' && renderLogin()}
          {currentScreen === 'SIGNUP' && renderSignup()}
          {currentScreen === 'RESET' && renderReset()}
          {['ADMIN', 'TEACHER', 'STUDENT'].includes(currentScreen) && renderDashboards()}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
