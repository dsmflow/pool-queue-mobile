import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Title, 
  ActivityIndicator,
  useTheme
} from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { RootStackNavigationProp } from '../../types/navigation.types';
import { useNavigation } from '@react-navigation/native';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigation = useNavigation<RootStackNavigationProp<'Login'>>();
  const theme = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        Alert.alert('Error', error.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            <Title style={styles.title}>Pool Queue</Title>
            <Text style={styles.subtitle}>Sign in to your account</Text>
            
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />
            
            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.button}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator animating={true} color={theme.colors.surface} />
              ) : (
                'Sign In'
              )}
            </Button>
            
            <Button
              mode="text"
              onPress={navigateToForgotPassword}
              style={styles.textButton}
            >
              Forgot Password?
            </Button>
            
            <View style={styles.registerContainer}>
              <Text>Don't have an account? </Text>
              <Button
                mode="text"
                onPress={navigateToRegister}
                style={styles.registerButton}
                labelStyle={styles.registerButtonLabel}
              >
                Sign Up
              </Button>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formContainer: {
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
  },
  textButton: {
    marginTop: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerButton: {
    marginLeft: -8,
  },
  registerButtonLabel: {
    marginHorizontal: 0,
  },
});
