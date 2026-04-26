from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from core.choices import ActionsChoices, RoleChoices


class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_active', True)
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', RoleChoices.ADMIN)
        return self.create_user(username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    username    = models.CharField(max_length=150, unique=True, db_index=True)
    fullname    = models.CharField(max_length=200, db_index=True, default='')
    email       = models.EmailField(unique=True, null=True, blank=True, db_index=True)
    employee_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    role        = models.CharField(max_length=10, choices=RoleChoices.choices)

    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)  # Django admin access
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    action        = models.CharField(max_length=10, choices=ActionsChoices.choices, default=ActionsChoices.CREATE)
    field_changed = models.CharField(max_length=500, null=True, blank=True)
    create_date   = models.DateTimeField(auto_now_add=True)
    update_date   = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = 'username'
    REQUIRED_FIELDS = ['fullname', 'role']

    objects = UserManager()

    def __str__(self):
        return f'{self.username} ({self.get_role_display()})'

    class Meta:
        app_label = 'user_auth'
        db_table  = 'user'


class UserLog(models.Model):
    user          = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    username      = models.CharField(max_length=150)
    fullname      = models.CharField(max_length=200)
    email         = models.EmailField(null=True, blank=True)
    employee_id   = models.CharField(max_length=20, null=True, blank=True)
    role          = models.CharField(max_length=10, choices=RoleChoices.choices)
    is_active     = models.BooleanField()
    is_deleted    = models.BooleanField()
    deleted_at    = models.DateTimeField(null=True, blank=True)
    action        = models.CharField(max_length=10, choices=ActionsChoices.choices)
    field_changed = models.CharField(max_length=500, null=True, blank=True)
    create_date   = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'user_auth'
        db_table  = 'user_log'
