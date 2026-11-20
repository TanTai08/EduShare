import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccountRow, Avatar, Button, Field } from '../../ui';
import { styles } from '../../styles';
import { EducationFields, type EducationDraft } from '../academic/EducationFields';
import type { User } from '../../models';

export function AccountScreen({ page, desktop, me, avatar, profileName, setProfileName, education, setEducation, onEdit, onSaved, onMine, onDeals, onWallet,
  onLogout, onPickAvatar, onSaveProfile }: {
  page: 'account' | 'edit'; desktop: boolean; me: User; avatar: string; profileName: string; setProfileName: (name: string) => void;
  education: EducationDraft; setEducation: (value: EducationDraft) => void;
  onEdit: () => void; onSaved: () => void; onMine: () => void; onDeals: () => void; onWallet: () => void;
  onLogout: () => void; onPickAvatar: () => void; onSaveProfile: () => void;
}) {

  if (page === 'account') return <View style={desktop ? styles.webSplit : styles.detailStack}>
    <View style={[styles.accountHero, desktop && styles.webSecondary]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Đổi ảnh đại diện" onPress={onEdit}>
        <Avatar user={me} large />
        <View style={styles.avatarCamera}><Ionicons name="camera-outline" size={16} color="#171815" /></View>
      </Pressable>
      <Text style={styles.detailTitle}>{me.name}</Text><Text style={styles.small}>{[me.school, me.region].filter(Boolean).join(' · ')}</Text>
      {!!me.major && <Text style={styles.small}>{[me.major, me.specialization].filter(Boolean).join(' · ')}</Text>}
    </View>
    <View style={[styles.detailStack, desktop && styles.webPrimary]}>
      <AccountRow glyph="person-outline" caption={me.major ? "Chỉnh sửa hồ sơ" : "Hoàn thiện hồ sơ"} press={onEdit} />
      <AccountRow glyph="bookmark-outline" caption="Tài liệu đã lưu" press={onSaved} />
      <AccountRow glyph="book-outline" caption="Bài đăng của tôi" press={onMine} />
      <AccountRow glyph="swap-horizontal-outline" caption="Lịch sử giao dịch" press={onDeals} />
      <AccountRow glyph="star-outline" caption="Ví điểm" press={onWallet} />
      <Button caption="Đăng xuất" onPress={onLogout} />
    </View>
  </View>;
  return <><Avatar user={{ ...me, avatar }} /><Button caption="Thay ảnh đại diện" alt onPress={onPickAvatar} /><Field label="Họ và tên" value={profileName} change={setProfileName} /><EducationFields value={education} change={setEducation} /><Button caption="Lưu thay đổi" onPress={onSaveProfile} /></>;
}
