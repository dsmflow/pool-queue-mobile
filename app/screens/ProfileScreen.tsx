import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { 
  Text, 
  Title, 
  Button, 
  Avatar, 
  Card,
  TextInput,
  ActivityIndicator,
  Divider
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../api/supabase';
import { Player } from '../types/database.types';

export const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [playerProfile, setPlayerProfile] = useState<Player | null>(null);
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPlayerProfile();
    }
  }, [user]);

  const fetchPlayerProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('email', user?.email)
        .single();

      if (error) {
        console.error('Error fetching player profile:', error);
      } else if (data) {
        setPlayerProfile(data);
        setName(data.name);
      }
    } catch (error) {
      console.error('Error in fetchPlayerProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      setUpdating(true);
      
      if (playerProfile) {
        const { error } = await supabase
          .from('players')
          .update({ name })
          .eq('id', playerProfile.id);

        if (error) {
          Alert.alert('Error', 'Failed to update profile');
          console.error('Error updating profile:', error);
        } else {
          Alert.alert('Success', 'Profile updated successfully');
          setPlayerProfile({ ...playerProfile, name });
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error('Error in handleUpdateProfile:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Avatar.Text 
            size={80} 
            label={playerProfile?.name.charAt(0) || 'U'} 
            style={styles.avatar}
          />
          <Title style={styles.title}>
            {isEditing ? 'Edit Profile' : 'My Profile'}
          </Title>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            {isEditing ? (
              <TextInput
                label="Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
              />
            ) : (
              <>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{playerProfile?.name}</Text>
              </>
            )}

            <Divider style={styles.divider} />

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email}</Text>

            <Divider style={styles.divider} />

            <Text style={styles.label}>Player Rating</Text>
            <Text style={styles.value}>{playerProfile?.rating}</Text>

            {isEditing ? (
              <View style={styles.buttonContainer}>
                <Button 
                  mode="contained" 
                  onPress={handleUpdateProfile}
                  style={styles.button}
                  loading={updating}
                  disabled={updating}
                >
                  Save Changes
                </Button>
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    setName(playerProfile?.name || '');
                    setIsEditing(false);
                  }}
                  style={styles.button}
                  disabled={updating}
                >
                  Cancel
                </Button>
              </View>
            ) : (
              <Button 
                mode="contained" 
                onPress={() => setIsEditing(true)}
                style={styles.button}
              >
                Edit Profile
              </Button>
            )}
          </Card.Content>
        </Card>

        <Button 
          mode="outlined" 
          onPress={handleSignOut}
          style={styles.signOutButton}
          icon="logout"
        >
          Sign Out
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  input: {
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 16,
  },
  button: {
    marginTop: 16,
  },
  signOutButton: {
    marginTop: 8,
  },
});
