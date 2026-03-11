from django.db import models
from apps.common.models import TimeStampedModel, SoftDeleteModel


class Conversation(TimeStampedModel, SoftDeleteModel):
    """
    A conversation thread between two clinic staff/practitioners.
    Both participants must belong to the same clinic.
    """
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='conversations',
    )
    participants = models.ManyToManyField(
        'accounts.User',
        through='ConversationParticipant',
        related_name='conversations',
    )

    class Meta:
        db_table = 'message_conversations'
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation #{self.pk} in {self.clinic.name}"

    def get_other_participant(self, user):
        return self.participants.exclude(pk=user.pk).first()


class ConversationParticipant(TimeStampedModel):
    """
    Through model — tracks last-read timestamp per participant
    so we can compute unread counts.
    """
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='conversation_memberships',
    )
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'message_conversation_participants'
        unique_together = ('conversation', 'user')

    def __str__(self):
        return f"{self.user.email} in Conversation #{self.conversation_id}"


class Message(TimeStampedModel, SoftDeleteModel):
    """
    A single message inside a conversation.
    """
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='sent_messages',
    )
    body = models.TextField()
    is_edited = models.BooleanField(default=False)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']

    def __str__(self):
        return f"Message #{self.pk} by {self.sender.email}"